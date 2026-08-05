import React, { useState } from 'react';
import { GoalConfig, StoreResult, Collaborator, IndividualResult, AIAnalysisResponse } from '../types';
import { calculateStoreMetrics, calculateSellerMetrics, formatCurrency, formatPercent } from '../utils/calculations';
import {
  Sparkles,
  Loader2,
  Brain,
  MessageSquare,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  Target,
  FileText,
  User,
  Zap,
} from 'lucide-react';

interface AIAnalysisTabProps {
  goalConfig: GoalConfig;
  storeResult: StoreResult;
  collaborators: Collaborator[];
  individualResults: Record<string, IndividualResult>;
  aiAnalysis: AIAnalysisResponse | null;
  setAiAnalysis: React.Dispatch<React.SetStateAction<AIAnalysisResponse | null>>;
}

export const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({
  goalConfig,
  storeResult,
  collaborators,
  individualResults,
  aiAnalysis,
  setAiAnalysis,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeMetrics = calculateStoreMetrics(goalConfig, storeResult, collaborators, individualResults);
  const sellers = collaborators.filter((c) => c.isSeller);

  const calculatedSellers = sellers.map((s) =>
    calculateSellerMetrics(s, goalConfig, individualResults[s.id])
  );

  const handleGenerateAIAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalConfig,
          storeMetrics,
          sellerMetrics: calculatedSellers,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao gerar análise inteligente via Gemini.';
        try {
          const errText = await response.text();
          const errJson = JSON.parse(errText);
          errorMsg = errJson.error || errJson.details || errorMsg;
        } catch {
          errorMsg = `Erro no servidor (${response.status} ${response.statusText}). Verifique se a chave de API está configurada.`;
        }
        throw new Error(errorMsg);
      }

      const data: AIAnalysisResponse = await response.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao conectar à Inteligência Artificial Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const getIssueBadge = (issue: string) => {
    switch (issue) {
      case 'FLUXO':
        return {
          label: 'DESAFIO DE FLUXO (Poucos Clientes)',
          bg: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
        };
      case 'VENDA_ADICIONAL':
        return {
          label: 'FOCO EM VENDA ADICIONAL / TICKET',
          bg: 'bg-[#f36e21]/20 border-[#f36e21]/40 text-[#f36e21]',
        };
      case 'MARGEM':
        return {
          label: 'ALERTA DE DESCONTO / MARGEM',
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
        };
      default:
        return {
          label: 'ALTA PERFORMANCE',
          bg: 'bg-[#00b5ac]/20 border-[#00b5ac]/40 text-[#00b5ac]',
        };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Action Box */}
      <div className="bg-gradient-to-r from-[#141519] via-[#1a1c22] to-[#121316] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00b5ac] to-[#008d86] flex items-center justify-center text-white shadow-lg shadow-[#00b5ac]/20">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Análise Inteligente de Vendas (Gemini AI)</h1>
              <p className="text-xs text-gray-400">
                Diagnóstico cruzado (Ticket Médio x Clientes x Itens x Margem) e scripts de coaching para o Gerente
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAIAnalysis}
            disabled={isLoading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00b5ac] to-[#008d86] hover:from-[#00a29a] hover:to-[#007b75] text-white text-xs font-bold shadow-xl shadow-[#00b5ac]/25 transition-all flex items-center space-x-2 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Diagnóstico Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar / Atualizar Análise Inteligente</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* AI Results */}
      {aiAnalysis ? (
        <div className="space-y-8">
          {/* Store Overview Insights */}
          <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/10 pb-4">
              <Zap className="w-5 h-5 text-[#00b5ac]" />
              <span>Visão Estratégica da Loja</span>
            </h2>

            <p className="text-sm text-gray-200 leading-relaxed bg-[#1e2026] p-4 rounded-2xl border border-white/5">
              {aiAnalysis.store.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pontos Fortes */}
              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-emerald-500/20 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pontos Fortes</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {aiAnalysis.store.strengthPoints?.map((pt, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pontos de Atenção */}
              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-amber-500/20 space-y-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  <span>Atenção Crítica</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {aiAnalysis.store.attentionPoints?.map((pt, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plano de Ação */}
              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-[#00b5ac]/20 space-y-2">
                <h3 className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider flex items-center space-x-1.5">
                  <Target className="w-4 h-4" />
                  <span>Plano de Ação Semanal</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {aiAnalysis.store.managerActionPlan?.map((pt, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00b5ac] shrink-0 mt-1.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {aiAnalysis.store.nonSellersImpactComment && (
              <div className="p-4 rounded-2xl bg-[#1e2026] border border-white/5 text-xs text-gray-300">
                <span className="font-bold text-[#00b5ac]">Impacto da Equipe do Balcão/Caixa (Não-Vendedores): </span>
                {aiAnalysis.store.nonSellersImpactComment}
              </div>
            )}
          </div>

          {/* Individual Sellers Diagnosis Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <User className="w-5 h-5 text-[#f36e21]" />
              <span>Diagnóstico por Vendedor e Sugestões de Fala (1-on-1)</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aiAnalysis.sellers.map((s) => {
                const issueBadge = getIssueBadge(s.primaryIssue);

                return (
                  <div
                    key={s.collaboratorId}
                    className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-white">{s.collaboratorName}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${issueBadge.bg}`}>
                        {issueBadge.label}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#1e2026] text-xs text-gray-300 space-y-1">
                      <span className="font-bold text-gray-400 block">Diagnóstico dos 3 Eixos:</span>
                      <p>{s.diagnosisDiagnosis}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#1e2026] text-xs text-gray-300 space-y-1">
                      <span className="font-bold text-[#00b5ac] block">Ação Recomendada de Vendas:</span>
                      <p>{s.recommendedAction}</p>
                    </div>

                    {/* Manager 1-on-1 Script */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#f36e21]/15 to-transparent border border-[#f36e21]/30 space-y-2">
                      <div className="flex items-center space-x-2 text-[#f36e21]">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Fala Sugerida para o Gerente no Feedback
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 italic leading-relaxed">
                        "{s.talkingPointScript}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#141519] border border-white/10 rounded-3xl p-12 text-center space-y-4">
          <Brain className="w-12 h-12 text-[#00b5ac] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-white">Nenhum diagnóstico gerado ainda</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Clique no botão acima "Gerar / Atualizar Análise Inteligente" para a IA analisar o faturamento, ticket médio e margens da farmácia com sugestões diretas para os vendedores.
          </p>
        </div>
      )}
    </div>
  );
};
