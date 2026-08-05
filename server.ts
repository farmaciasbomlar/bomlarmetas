import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware to parse JSON payloads (allowing large base64 images up to 20MB)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to instantiate GoogleGenAI
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não está configurada no ambiente.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// API 1: OCR Report Reader (Imagem 2 -> Structured Data)
// ----------------------------------------------------
app.post('/api/ocr-dual-prints', async (req, res) => {
  try {
    const { goalsImageBase64, performanceImageBase64 } = req.body;

    if (!goalsImageBase64 && !performanceImageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi fornecida para análise.' });
    }

    const ai = getGenAI();

    const parts: any[] = [];

    if (goalsImageBase64) {
      const cleanGoals = goalsImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanGoals,
          mimeType: 'image/jpeg',
        },
      });
      parts.push({
        text: 'IMAGEM 1: PLANILHA DE METAS INDIVIDUAIS DOS VENDEDORES. Extraia o código do vendedor, o nome completo do vendedor e o valor da meta estipulada em R$ para o mês.',
      });
    }

    if (performanceImageBase64) {
      const cleanPerf = performanceImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanPerf,
          mimeType: 'image/jpeg',
        },
      });
      parts.push({
        text: 'IMAGEM 2: RELATÓRIO DE DESEMPENHO POR COLABORADOR (RELATÓRIO 802 OU SIMILAR). Extraia o código do colaborador, nome completo, Venda Bruta (R$), Desconto (R$), Venda Líquida (R$), Ticket Médio (R$), Clientes, Itens, Unidades e o Total Geral da Loja se disponível.',
      });
    }

    parts.push({
      text: `REGRAS E INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO:
1. Formato numérico brasileiro: O ponto (.) é separador de milhar e a vírgula (,) é o decimal (ex: 1.030,05 = 1030.05). Converta rigorosamente para números decimais JS (floats).
2. Códigos: Extraia os códigos limpos (ex: "0727" ou "727").
3. Venda Líquida: É o valor de venda realizada para cada vendedor/colaborador.
4. Para a Planilha de Metas, inclua na lista de metas todos os vendedores com seus códigos e valores de meta em R$.
5. Para o Desempenho, inclua todos os colaboradores encontrados no relatório com sua Venda Líquida.
6. Retorne rigorosamente no JSON formatado.`,
    });

    const systemInstruction = `Você é um sistema especialista em OCR e análise comercial de farmácias e varejo. Extraia com precisão absoluta dados das planilhas e relatórios de vendas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalsSheet: {
              type: Type.ARRAY,
              description: 'Metas individuais por vendedor extraídas do print da planilha',
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: 'Código do vendedor (ex: 0727)' },
                  name: { type: Type.STRING, description: 'Nome do vendedor' },
                  targetAmount: { type: Type.NUMBER, description: 'Meta em R$' },
                },
                required: ['code', 'name', 'targetAmount'],
              },
            },
            performanceSheet: {
              type: Type.ARRAY,
              description: 'Resultados de desempenho por colaborador extraídos do print de desempenho',
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: 'Código do colaborador (ex: 727)' },
                  name: { type: Type.STRING, description: 'Nome do colaborador' },
                  grossSales: { type: Type.NUMBER },
                  discountAmount: { type: Type.NUMBER },
                  discountPercent: { type: Type.NUMBER },
                  netSales: { type: Type.NUMBER, description: 'Venda Líquida em R$' },
                  items: { type: Type.NUMBER },
                  units: { type: Type.NUMBER },
                  clients: { type: Type.NUMBER },
                  ticketMedio: { type: Type.NUMBER },
                },
                required: ['code', 'name', 'netSales'],
              },
            },
            storeTotal: {
              type: Type.OBJECT,
              properties: {
                grossSales: { type: Type.NUMBER },
                discountAmount: { type: Type.NUMBER },
                discountPercent: { type: Type.NUMBER },
                netSales: { type: Type.NUMBER },
                items: { type: Type.NUMBER },
                units: { type: Type.NUMBER },
                clients: { type: Type.NUMBER },
                ticketMedio: { type: Type.NUMBER },
              },
            },
          },
          required: ['goalsSheet', 'performanceSheet'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Erro na API OCR Dual Prints:', error);
    return res.status(500).json({
      error: 'Falha ao processar imagens via OCR Gemini.',
      details: error.message,
    });
  }
});

app.post('/api/ocr-report', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi fornecida.' });
    }

    const ai = getGenAI();

    // System prompt instructing Gemini on Pharmacy Report 802 structure
    const systemInstruction = `Você é um sistema especialista em OCR e extração de dados para relatórios de sistemas de farmácias (como o relatório 'Resumo de Desempenho por Colaborador 802').

Sua tarefa é analisar a imagem enviada (print de tela de relatório) e extrair com extrema precisão os dados numéricos de cada colaborador e da linha de 'Total Geral'.

Campos das colunas a extrair por colaborador:
- Colaborador: Código e Nome completo (ex: "0736-DANIELI NOBRE DA SILVA")
- Código: número do código (ex: "0736" ou "736")
- Nome: nome limpo sem o código
- Venda Bruta (R$)
- Desconto (R$)
- % Desconto (da coluna %DPro ou %DUSu se houver, ou calcule Desconto / Venda Bruta * 100)
- Venda Líquida (R$) (coluna Venda Liq.)
- Itens (número de itens)
- Unidades (número de unidades - coluna Unids)
- Clientes (número de clientes atendidos)
- Ticket Médio (R$) (coluna TkMedio)

Atenção ao formato numérico brasileiro:
- O separador de milhar é ponto (.) e o decimal é vírgula (,). Exemplo: '1.030,05' significa 1030.05. '8.361,81' significa 8361.81.
- Converta todos os valores para números reais (floats com ponto decimal JS).

Retorne rigorosamente um JSON estruturado com o schema solicitado.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: 'Extraia todos os dados de desempenho por colaborador e o total geral desta imagem de relatório de farmácia.',
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeTotal: {
              type: Type.OBJECT,
              properties: {
                grossSales: { type: Type.NUMBER, description: 'Venda Bruta total da loja' },
                discountAmount: { type: Type.NUMBER, description: 'Desconto total em R$' },
                discountPercent: { type: Type.NUMBER, description: '% de desconto total' },
                netSales: { type: Type.NUMBER, description: 'Venda Líquida total da loja' },
                items: { type: Type.NUMBER, description: 'Total de itens' },
                units: { type: Type.NUMBER, description: 'Total de unidades' },
                clients: { type: Type.NUMBER, description: 'Total de clientes' },
                ticketMedio: { type: Type.NUMBER, description: 'Ticket Médio da loja' },
              },
              required: ['netSales', 'ticketMedio'],
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: 'Código do colaborador (ex: 0736)' },
                  name: { type: Type.STRING, description: 'Nome do colaborador (ex: DANIELI NOBRE DA SILVA)' },
                  grossSales: { type: Type.NUMBER, description: 'Venda bruta R$' },
                  discountAmount: { type: Type.NUMBER, description: 'Desconto R$' },
                  discountPercent: { type: Type.NUMBER, description: '% Desconto' },
                  netSales: { type: Type.NUMBER, description: 'Venda líquida R$' },
                  items: { type: Type.NUMBER, description: 'Número de itens' },
                  units: { type: Type.NUMBER, description: 'Número de unidades' },
                  clients: { type: Type.NUMBER, description: 'Número de clientes' },
                  ticketMedio: { type: Type.NUMBER, description: 'Ticket médio R$' },
                },
                required: ['code', 'name', 'netSales', 'ticketMedio'],
              },
            },
            rawTextSummary: { type: Type.STRING, description: 'Resumo do OCR para conferência' },
          },
          required: ['storeTotal', 'rows'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Erro na API OCR:', error);
    return res.status(500).json({
      error: 'Falha ao processar imagem via OCR Gemini.',
      details: error.message,
    });
  }
});

// ----------------------------------------------------
// API 2: AI Intelligent Diagnostics & Manager Script
// ----------------------------------------------------
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { goalConfig, storeMetrics, sellerMetrics } = req.body;

    if (!goalConfig || !sellerMetrics) {
      return res.status(400).json({ error: 'Dados insuficientes para análise.' });
    }

    const ai = getGenAI();

    const systemInstruction = `Você é o mais respeitado consultor de gestão de metas e alta performance para varejo farmacêutico do Brasil.
Sua missão é fornecer diagnósticos ultra-práticos, profissionais, empáticos e diretamente aplicáveis para o gerente de farmácia liderar sua equipe.

ANÁLISE POR VENDEDOR (3 EIXOS + CRUZAMENTO TICKET X CLIENTES X ITENS):
Para cada vendedor, você deve analisar:
1. FATURAMENTO: Ritmo atual vs esperado (no ritmo, leve atraso, fora do ritmo)
2. TICKET MÉDIO: Se está abaixo da meta (meta típica R$ 54,00). Se baixo, qual estratégia de vendas recomendada?
3. MARGEM / DESCONTOS: Se o % de desconto está alto (ex: >22%), alertar para preservação da margem da farmácia.

CRUZAMENTO DIAGNÓSTICO (CAUSA RAIZ):
- FLUXO: Se o vendedor atendeu poucos clientes proporcionalmente, o desafio é captação / rotação no balcão.
- VENDA ADICIONAL / UP SELLING: Se o vendedor atendeu bom volume de clientes mas com ticket médio baixo e poucos itens/cliente (< 2.2 itens/atendimento), a causa é falta de oferta complementar (focar em dermocosméticos, vitaminas, protetor solar, genéricos no balcão).
- MARGEM: Se a venda bruta é boa mas a líquida cai por descontos excessivos.
- EXCELENTE: Se atinge ritmo, ticket e boa margem.

SUGESTÃO DE CONVERSA (SCRIPT 1-ON-1):
Crie uma fala direta, humana e motivadora em português brasileiro para o gerente dizer ao vendedor em feedback presencial. Exemplo:
"Danieli, seu faturamento está OK, mas seu ticket médio está em R$38,15 (meta R$54,00). Você atendeu 27 clientes com média de 1,7 itens. Nos próximos dias, vamos focar em oferecer uma vitamina C ou hidratante labial na fila do caixa para subir 1 item por atendimento e atingirmos sua meta diária de R$ 900,00!"

FORMATO DE SAÍDA: JSON estrito.`;

    const promptData = {
      monthName: goalConfig.monthName,
      totalGoal: goalConfig.totalGoal,
      elapsedDays: goalConfig.elapsedDays,
      totalBusinessDays: goalConfig.totalBusinessDays,
      expectedPacePercent: storeMetrics?.expectedPacePercent,
      storeNetSales: storeMetrics?.netSales,
      storePercentAchieved: storeMetrics?.percentAchieved,
      storeTicketMedio: storeMetrics?.ticketMedio,
      sellers: sellerMetrics.map((s: any) => ({
        id: s.collaborator.id,
        name: s.collaborator.name,
        targetAmount: s.targetAmount,
        netSales: s.netSales,
        percentAchieved: s.percentAchieved,
        status: s.status,
        ticketMedio: s.ticketMedio,
        ticketGoal: s.ticketGoal,
        clientsCount: s.clientsCount,
        itemsCount: s.itemsCount,
        itemsPerClient: s.itemsPerClient,
        discountPercent: s.discountPercent,
        dailyRequiredSales: s.dailyRequiredSales,
      })),
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Análise de Desempenho e Diagnóstico de Vendas da Farmácia: ${JSON.stringify(promptData)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            store: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: 'Visão geral do faturamento e ritmo da loja' },
                strengthPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Pontos Fortes da Loja',
                },
                attentionPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Pontos de Atenção Críticos',
                },
                managerActionPlan: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Plano de Ação do Gerente para a semana',
                },
                nonSellersImpactComment: {
                  type: Type.STRING,
                  description: 'Comentário sobre a contribuição do Balcão/Farmacêutico/Caixa (Não-vendedores)',
                },
              },
              required: ['summary', 'strengthPoints', 'attentionPoints', 'managerActionPlan'],
            },
            sellers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  collaboratorId: { type: Type.STRING },
                  collaboratorName: { type: Type.STRING },
                  diagnosisDiagnosis: { type: Type.STRING, description: 'Diagnóstico sintético dos 3 eixos' },
                  primaryIssue: {
                    type: Type.STRING,
                    enum: ['FLUXO', 'VENDA_ADICIONAL', 'MARGEM', 'EXCELENTE'],
                  },
                  issueLabel: { type: Type.STRING, description: 'Rótulo amigável da causa raiz' },
                  recommendedAction: { type: Type.STRING, description: 'Ação prioritária de vendas' },
                  talkingPointScript: { type: Type.STRING, description: 'Script para o Gerente usar no 1-on-1' },
                },
                required: [
                  'collaboratorId',
                  'collaboratorName',
                  'diagnosisDiagnosis',
                  'primaryIssue',
                  'issueLabel',
                  'recommendedAction',
                  'talkingPointScript',
                ],
              },
            },
          },
          required: ['store', 'sellers'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Erro na API AI Analysis:', error);
    return res.status(500).json({
      error: 'Falha ao gerar diagnóstico com Inteligência Artificial.',
      details: error.message,
    });
  }
});

// Vite or Static files handler
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
