import React, { useRef, useState } from 'react';
import { Collaborator, GoalConfig, IndividualResult, AIAnalysisSeller } from '../types';
import {
  calculateSellerMetrics,
  formatCurrency,
  formatPercent,
  formatNumber,
} from '../utils/calculations';
import { exportElementToPdf } from '../utils/pdfExport';
import {
  Trophy,
  Download,
  Flame,
  Target,
  TrendingUp,
  Award,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface SellerPresentationCardProps {
  sellers: Collaborator[];
  selectedSellerId: string;
  setSelectedSellerId: (id: string) => void;
  goalConfig: GoalConfig;
  individualResults: Record<string, IndividualResult>;
  aiAnalysisSellers?: AIAnalysisSeller[];
}

export const SellerPresentationCard: React.FC<SellerPresentationCardProps> = ({
  sellers,
  selectedSellerId,
  setSelectedSellerId,
  goalConfig,
  individualResults,
  aiAnalysisSellers,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const currentSeller = sellers.find((s) => s.id === selectedSellerId) || sellers[0];

  if (!currentSeller) {
    return (
      <div className="p-8 text-center text-gray-400">
        Nenhum vendedor cadastrado. Acesse a aba "Equipe & Metas" para cadastrar vendedores.
      </div>
    );
  }

  const metrics = calculateSellerMetrics(
    currentSeller,
    goalConfig,
    individualResults[currentSeller.id]
  );

  const sellerAI = aiAnalysisSellers?.find((s) => s.collaboratorId === currentSeller.id);

  // Status semaphore badge
  const getStatusInfo = (status: 'ON_PACE' | 'WARNING' | 'BEHIND') => {
    switch (status) {
      case 'ON_PACE':
        return {
          label: 'NO RITMO / EXCELENTE',
          bg: 'bg-[#00b5ac]/20 border-[#00b5ac]/40 text-[#00b5ac]',
          color: '#00b5ac',
          icon: CheckCircle2,
        };
      case 'WARNING':
        return {
          label: 'ATENÇÃO / LEVE ATRASO',
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
          color: '#f59e0b',
          icon: AlertTriangle,
        };
      case 'BEHIND':
        return {
          label: 'FORA DO RITMO (ACELERAR)',
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          color: '#f43f5e',
          icon: XCircle,
        };
    }
  };

  const statusInfo = getStatusInfo(metrics.status);
  const StatusIcon = statusInfo.icon;

  // Ring Calculation
  const strokeDasharray = 283;
  const normalizedPercent = Math.min(100, Math.max(0, metrics.percentAchieved));
  const strokeDashoffset = strokeDasharray - (strokeDasharray * normalizedPercent) / 100;

  const [exportError, setExportError] = useState<string | null>(null);

  // Export Card to PDF function using html-to-image & jsPDF
  const handleExportPDF = async () => {
    if (!cardRef.current || isExportingPDF) return;
    setIsExportingPDF(true);
    setExportError(null);

    try {
      const filename = `Cartao_Meta_${currentSeller.name.replace(/\s+/g, '_')}_${goalConfig.monthName}`;
      await exportElementToPdf(cardRef.current, filename, '#0d0d0d');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setExportError('Falha ao gerar o PDF. Por favor, tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* User error notification if PDF export fails */}
      {exportError && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{exportError}</span>
          </div>
          <button
            onClick={() => setExportError(null)}
            className="text-gray-400 hover:text-white text-xs underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Seller Selector & PDF Action Bar */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00b5ac] to-[#008d86] flex items-center justify-center text-white">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Cartão de Apresentação Motivadora</h2>
            <p className="text-xs text-gray-400">Apresentação para o vendedor e exportação em PDF</p>
          </div>
        </div>

        {/* Selector */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-400">Vendedor:</label>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="bg-[#1e2026] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#00b5ac]"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `[${s.code}] ` : ''}
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center space-x-2 ${
              isExportingPDF
                ? 'bg-gray-700 cursor-not-allowed opacity-75'
                : 'bg-gradient-to-r from-[#f36e21] to-[#e05c10] hover:from-[#e05c10] hover:to-[#c84d07] shadow-[#f36e21]/20'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPDF ? 'Gerando PDF...' : 'Exportar Cartão em PDF'}</span>
          </button>
        </div>
      </div>

      {/* GAMIFIED PRESENTATION CARD (ESTILO IMAGEM 3 - DARK MODE LUXO TURQUESA/LARANJA) */}
      <div
        ref={cardRef}
        style={{ backgroundColor: '#0d0d0d' }}
        className="relative bg-gradient-to-br from-[#0d0e11] via-[#141519] to-[#1a1c22] border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden space-y-8"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00b5ac]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#f36e21]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10 flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center space-x-4">
            <img
              src="https://i.ibb.co/LdKcYjTq/01-LOGO-BOM-LAR-2024-sem-Tarja-PRINCIPAL.png"
              alt="Bom Lar Resultados"
              className="h-12 w-auto object-contain max-w-[160px]"
              crossOrigin="anonymous"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold tracking-widest text-[#00b5ac] uppercase">
                  Bom Lar Resultados — Mês de {goalConfig.monthName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#f36e21]/20 text-[#f36e21] border border-[#f36e21]/30">
                  Dia {goalConfig.elapsedDays} de {goalConfig.totalBusinessDays}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mt-1">
                {currentSeller.name} <span className="text-xs font-mono text-gray-500">(Cód: {currentSeller.code})</span>
              </h1>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-2xl border ${statusInfo.bg} flex items-center space-x-2 text-xs font-black shadow-lg`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {/* Main Grid: Ring & Daily Target */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Ring Progress (Estilo Imagem 3) */}
          <div className="md:col-span-6 flex flex-col items-center justify-center p-4 bg-[#121316]/80 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#23252d" strokeWidth="10" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={statusInfo.color}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center text-center">
                <span className="text-4xl font-black text-white font-mono tracking-tight">
                  {formatPercent(metrics.percentAchieved, 1)}
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  da Meta Batida
                </span>
                <span className="text-xs text-[#00b5ac] font-mono mt-1 font-semibold">
                  Alvo: {formatCurrency(metrics.targetAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2 text-center">
              Faturado até hoje:{' '}
              <strong className="text-white font-mono">{formatCurrency(metrics.netSales)}</strong>
            </p>
          </div>

          {/* Daily Goal & Ticket Médio Big Cards */}
          <div className="md:col-span-6 space-y-4">
            {/* Daily Goal Required */}
            <div className="bg-gradient-to-r from-[#f36e21]/20 to-[#e05c10]/10 border border-[#f36e21]/40 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#f36e21] uppercase tracking-wider">
                  Meta Diária Necessária
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#f36e21] flex items-center justify-center text-white shadow-md">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white font-mono">
                {formatCurrency(metrics.dailyRequiredSales)}
                <span className="text-xs font-normal text-gray-300 block font-sans mt-0.5">
                  / dia nos {metrics.daysRemaining} dias restantes do mês
                </span>
              </p>
            </div>

            {/* Ticket Médio Meter */}
            <div className="bg-[#121316]/80 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider">
                  Ticket Médio Atual
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#00b5ac]/20 flex items-center justify-center text-[#00b5ac]">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-extrabold text-white font-mono">
                  {formatCurrency(metrics.ticketMedio)}
                </p>
                <span className="text-xs font-mono text-gray-400">
                  Meta: {formatCurrency(metrics.ticketGoal)}
                </span>
              </div>
              <div className="w-full h-2 bg-[#23252d] rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#00b5ac] rounded-full"
                  style={{
                    width: `${Math.min(100, (metrics.ticketMedio / (metrics.ticketGoal || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Numbers Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#121316] border border-white/5">
          <div>
            <span className="text-[11px] text-gray-400 block">Clientes Atendidos</span>
            <span className="text-lg font-bold text-white font-mono">{formatNumber(metrics.clientsCount)}</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">Itens Vendidos</span>
            <span className="text-lg font-bold text-white font-mono">{formatNumber(metrics.itemsCount)}</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">Média de Itens/Cliente</span>
            <span className="text-lg font-bold text-[#00b5ac] font-mono">
              {metrics.itemsPerClient.toFixed(1)} itens
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">% Desconto Concedido</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {formatPercent(metrics.discountPercent, 1)}
            </span>
          </div>
        </div>

        {/* Manager AI Script & Tip Box */}
        {sellerAI && (
          <div className="relative z-10 bg-gradient-to-r from-[#00b5ac]/10 to-purple-500/10 border border-[#00b5ac]/30 rounded-3xl p-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#00b5ac]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Orientação & Dica de Vendas (Análise IA)
              </h3>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed italic bg-[#121316]/60 p-4 rounded-2xl border border-white/5">
              "{sellerAI.talkingPointScript}"
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-gray-500 pt-4 border-t border-white/5">
          <span>PharmaMetas — Sistema Gamificado de Gestão de Farmácia</span>
          <span>Impresso / Exportado em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};
