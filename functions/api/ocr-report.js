import { GoogleGenAI } from '@google/genai';

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
    const { reportImageBase64 } = await request.json();
    if (!reportImageBase64) {
      return Response.json({ error: 'Nenhuma imagem de relatório foi fornecida.' }, { status: 400 });
    }
    const ai = getGenAI(env);
    const clean = reportImageBase64.replace(/^data:image\/\w+;base64,/, '');

    const parts = [
      { inlineData: { data: clean, mimeType: 'image/jpeg' } },
      { text: `RELATÓRIO DE DESEMPENHO POR COLABORADOR (RELATÓRIO 802 OU SIMILAR). Extraia obrigatoriamente para cada colaborador: código, nome completo, Venda Bruta (R$), Desconto (R$), Venda Líquida (R$), Ticket Médio (R$), Clientes, Itens, Unidades. Extraia também o Total Geral da Loja se disponível. Converta valores no formato brasileiro (ex: 1.234,56 -> 1234.56).` },
    ];

    const systemInstruction = `Você é um sistema especialista em OCR e análise comercial de farmácias e varejo. Extraia com precisão absoluta os dados do relatório de desempenho.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isQuota = error?.status === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota exceeded');
    return new Response(
      JSON.stringify({
        error: isQuota
          ? 'A cota temporária do Gemini foi excedida. Aguarde 10 a 15 segundos e tente novamente.'
          : 'Falha ao processar o relatório via OCR Gemini.',
        isQuotaExceeded: isQuota,
        details: error.message,
      }),
      { status: isQuota ? 429 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
