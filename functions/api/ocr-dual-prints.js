import { GoogleGenAI, Type } from '@google/genai';

function getGenAI(env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não está configurada no ambiente.');
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function parseRetryDelayMs(err, defaultMs) {
  const errStr = String(err?.message || err || '');
  const match = errStr.match(/retry in ([0-9.]+)s/i);
  if (match && match[1]) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds) && seconds > 0) return Math.min(Math.ceil(seconds * 1000) + 500, 15000);
  }
  return Math.max(defaultMs, 3000);
}

async function generateContentWithRetry(ai, params, retriesPerModel = 2, initialDelayMs = 2000) {
  const primaryModel = params.model || 'gemini-2.5-flash';
  const modelsToTry = Array.from(new Set([
    primaryModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro',
  ])).filter(Boolean);
  let lastError = null;
  for (const modelName of modelsToTry) {
    let delayMs = initialDelayMs;
    for (let attempt = 1; attempt <= retriesPerModel; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model: modelName });
      } catch (err) {
        lastError = err;
        const errStr = String(err?.message || err);
        const isTransient = err?.status === 503 || err?.status === 429 || err?.code === 503 || err?.code === 429 ||
          errStr.includes('503') || errStr.includes('429') || errStr.includes('high demand') ||
          errStr.includes('UNAVAILABLE') || errStr.includes('RESOURCE_EXHAUSTED');
        if (isTransient) {
          const waitTime = parseRetryDelayMs(err, delayMs);
          if (attempt < retriesPerModel) { await new Promise((r) => setTimeout(r, waitTime)); delayMs *= 2; }
        } else { throw err; }
      }
    }
  }
  throw lastError || new Error('Não foi possível se comunicar com o Gemini.');
}

export async function onRequestPost({ request, env }) {
  try {
    const { goalsImageBase64, performanceImageBase64 } = await request.json();
    if (!goalsImageBase64 && !performanceImageBase64) {
      return Response.json({ error: 'Nenhuma imagem foi fornecida para análise.' }, { status: 400 });
    }
    const ai = getGenAI(env);
    const parts = [];

    if (goalsImageBase64) {
      const cleanGoals = goalsImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inlineData: { data: cleanGoals, mimeType: 'image/jpeg' } });
      parts.push({ text: `IMAGEM 1: PLANILHA DE METAS INDIVIDUAIS E TICKET MÉDIO DA FARMÁCIA. Extraia obrigatoriamente:
1) "sellerTicketGoal": O valor numérico de "Ticket Médio vendedor" (meta de ticket por vendedor em R$, ex: 61,00 -> 61.00).
2) "storeTicketGoal": O valor numérico de "Ticket Médio loja" (meta de ticket da loja em R$, ex: 57,00 -> 57.00).
3) A lista de vendedores com código, nome e meta estipulada em R$ para o mês.
4) A meta total da loja se visível.` });
    }

    if (performanceImageBase64) {
      const cleanPerf = performanceImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inlineData: { data: cleanPerf, mimeType: 'image/jpeg' } });
      parts.push({ text: 'IMAGEM 2: RELATÓRIO DE DESEMPENHO POR COLABORADOR (RELATÓRIO 802 OU SIMILAR). Extraia o código do colaborador, nome completo, Venda Bruta (R$), Desconto (R$), Venda Líquida (R$), Ticket Médio (R$), Clientes, Itens, Unidades e o Total Geral da Loja se disponível.' });
    }

    parts.push({ text: `REGRAS E INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO:
1. Formato numérico brasileiro: O ponto (.) é separador de milhar e a vírgula (,) é o decimal (ex: 1.030,05 = 1030.05). Converta rigorosamente para números decimais JS (floats).
2. Códigos: Extraia os códigos limpos (ex: "0727" ou "727").
3. Venda Líquida: É o valor de venda realizada para cada vendedor/colaborador.
4. Para a Planilha de Metas, extraia SEPARADAMENTE os dois valores de ticket médio:
   - "sellerTicketGoal": O valor da coluna/célula "Ticket Médio vendedor" (ex: R$ 61,00 -> 61.00).
   - "storeTicketGoal": O valor da coluna/célula "Ticket Médio loja" (ex: 57,00 -> 57.00).
5. Inclua na lista de metas todos os vendedores com seus códigos e valores de meta em R$.
6. Para o Desempenho, inclua todos os colaboradores encontrados no relatório com sua Venda Líquida.
7. Retorne rigorosamente no JSON formatado.` });

    const systemInstruction = `Você é um sistema especialista em OCR e análise comercial de farmácias e varejo. Extraia com precisão absoluta dados das planilhas e relatórios de vendas.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sellerTicketGoal: { type: Type.NUMBER, description: 'Meta de Ticket Médio do Vendedor em R$' },
            storeTicketGoal: { type: Type.NUMBER, description: 'Meta de Ticket Médio da Loja em R$' },
            goalsSheet: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING }, name: { type: Type.STRING }, targetAmount: { type: Type.NUMBER },
                },
                required: ['code', 'name', 'targetAmount'],
              },
            },
            performanceSheet: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING }, name: { type: Type.STRING },
                  grossSales: { type: Type.NUMBER }, discountAmount: { type: Type.NUMBER },
                  discountPercent: { type: Type.NUMBER }, netSales: { type: Type.NUMBER },
                  items: { type: Type.NUMBER }, units: { type: Type.NUMBER },
                  clients: { type: Type.NUMBER }, ticketMedio: { type: Type.NUMBER },
                },
                required: ['code', 'name', 'netSales'],
              },
            },
            storeTotal: {
              type: Type.OBJECT,
              properties: {
                grossSales: { type: Type.NUMBER }, discountAmount: { type: Type.NUMBER },
                discountPercent: { type: Type.NUMBER }, netSales: { type: Type.NUMBER },
                items: { type: Type.NUMBER }, units: { type: Type.NUMBER },
                clients: { type: Type.NUMBER }, ticketMedio: { type: Type.NUMBER },
              },
            },
          },
          required: ['goalsSheet', 'performanceSheet'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return Response.json(parsedJson);
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isQuota = error?.status === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota exceeded');
    return Response.json({
      error: isQuota ? 'A cota temporária do Gemini foi excedida. Aguarde 10 a 15 segundos e tente novamente.' : 'Falha ao processar imagens via OCR Gemini.',
      isQuotaExceeded: isQuota, details: error.message,
    }, { status: isQuota ? 429 : 500 });
  }
}
