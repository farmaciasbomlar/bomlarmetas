import { GoogleGenAI } from '@google/genai';

// ── CORS ──────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Responde ao preflight (isto resolve o erro 405)
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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
    const { data, prompt } = await request.json();
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Nenhum dado foi fornecido para análise.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
    const ai = getGenAI(env);

    const systemInstruction = `Você é um analista comercial sênior especializado em farmácias e varejo, com a personalidade da assistente Bom Lar: prestativa, confiável, humilde, cuidadora e inovadora. Analise os dados de desempenho dos colaboradores e gere insights claros, práticos e acionáveis. Use tom profissional, humano e acolhedor. Destaque: melhores desempenhos, oportunidades de melhoria, comparações de ticket médio e sugestões concretas de ação.`;

    const userPrompt = prompt || 'Faça uma análise completa do desempenho da equipe com base nos dados abaixo.';

    const parts = [
      { text: `${userPrompt}\n\nDADOS:\n${JSON.stringify(data, null, 2)}` },
    ];

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: { systemInstruction },
    });

    return new Response(
      JSON.stringify({ analysis: response.text || 'Não foi possível gerar a análise.' }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isQuota = error?.status === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota exceeded');
    return new Response(
      JSON.stringify({
        error: isQuota
          ? 'A cota temporária do Gemini foi excedida. Aguarde 10 a 15 segundos e tente novamente.'
          : 'Falha ao gerar a análise via Gemini.',
        isQuotaExceeded: isQuota,
        details: error.message,
      }),
      { status: isQuota ? 429 : 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
