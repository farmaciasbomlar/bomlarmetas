import React, { useState, useRef } from 'react';
import { GoalConfig, StoreResult, Collaborator, IndividualResult } from '../types';
import {
  calculateStoreMetrics,
  calculateSellerMetrics,
  getManualDailyOverride,
  getManualTicketOverride,
  formatCurrency,
  formatPercent,
  formatNumber,
} from '../utils/calculations';
import { exportElementToPdf } from '../utils/pdfExport';
import { MuralPdfTemplate } from './MuralPdfTemplate';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  Award,
  RotateCcw,
  Printer,
} from 'lucide-react';

interface StoreDashboardTabProps {
  goalConfig: GoalConfig;
  storeResult: StoreResult;
  collaborators: Collaborator[];
  individualResults: Record<string, IndividualResult>;
  manualDailyRequiredMap?: Record<string, number | null>;
  manualTicketGoalMap?: Record<string, number | null>;
  manualStoreDailyRequired?: number | null;
  setManualStoreDailyRequired?: React.Dispatch<React.SetStateAction<number | null>>;
  onSelectSeller: (sellerId: string) => void;
  onGoToEntry: () => void;
}

export const StoreDashboardTab: React.FC<StoreDashboardTabProps> = ({
  goalConfig,
  storeResult,
  collaborators,
  individualResults,
  manualDailyRequiredMap,
  manualTicketGoalMap,
  manualStoreDailyRequired,
  setManualStoreDailyRequired,
  onSelectSeller,
  onGoToEntry,
}) => {
  const storeMetrics = calculateStoreMetrics(goalConfig, storeResult, collaborators, individualResults);
  const sellers = collaborators.filter((c) => c.isSeller);

  // Find or create OUTROS collaborator for display
  const outrosCollab = collaborators.find(
    (c) =>
      c.code === '0' ||
      c.code === 'OUTROS' ||
      c.role === 'Outros' ||
      c.id === 'seller-outros' ||
      c.id === 'nonseller-02'
  );

  const displayCollaborators = [...sellers];
  if (outrosCollab) {
    if (!displayCollaborators.some((c) => c.id === outrosCollab.id)) {
      displayCollaborators.push(outrosCollab);
    }
  } else {
    displayCollaborators.push({
      id: 'seller-outros',
      code: '0',
      name: 'GERÊNCIA / CAIXA / OUTROS',
      isSeller: false,
      role: 'Outros',
      weightPercent: 0,
      ticketGoal: 0,
    });
  }

  // Helper to parse numeric values from user input
  const parseFormattedNumber = (input: string): number | null => {
    if (!input) return null;
    let cleaned = input.replace(/[R$\s]/g, '');
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const [isEditingStoreDaily, setIsEditingStoreDaily] = useState(false);
  const [editingStoreDailyValue, setEditingStoreDailyValue] = useState('');

  const isStoreDailyOverridden =
    manualStoreDailyRequired !== undefined && manualStoreDailyRequired !== null;

  const effectiveStoreDailyRequired = isStoreDailyOverridden
    ? manualStoreDailyRequired!
    : storeMetrics.dailyRequiredSales;

  const handleSaveStoreDailyInput = () => {
    const num = parseFormattedNumber(editingStoreDailyValue);
    if (num !== null && num >= 0) {
      setManualStoreDailyRequired?.(num);
    }
    setIsEditingStoreDaily(false);
  };

  const calculatedSellers = displayCollaborators.map((collaborator) => {
    const isOutros =
      collaborator.code === '0' ||
      collaborator.code === 'OUTROS' ||
      collaborator.role === 'Outros' ||
      collaborator.id === 'seller-outros' ||
      collaborator.id === 'nonseller-02';

    // Find result in individualResults
    let result: IndividualResult | undefined =
      individualResults[collaborator.id] ||
      (collaborator.code ? individualResults[collaborator.code] : undefined);

    if (isOutros && !result) {
      result =
        individualResults['seller-outros'] ||
        individualResults['nonseller-02'] ||
        individualResults['OUTROS'] ||
        individualResults['0'] ||
        Object.values(individualResults).find(
          (r: IndividualResult) =>
            r.collaboratorId === 'seller-outros' ||
            r.collaboratorId === 'nonseller-02' ||
            r.collaboratorId === '0'
        );
    }

    // Consolidated values for OUTROS
    let effectiveResult = result;
    if (isOutros) {
      const netSales =
        result && result.netSales !== undefined && result.netSales >= 0
          ? result.netSales
          : storeMetrics.nonSellersNetSales;
      const clientsCount = result?.clientsCount || 0;
      const ticketMedio =
        result?.ticketMedio && result.ticketMedio > 0
          ? result.ticketMedio
          : clientsCount > 0
          ? netSales / clientsCount
          : 0;
      const itemsCount = result?.itemsCount || 0;
      const unitsCount = result?.unitsCount || 0;

      effectiveResult = {
        collaboratorId: collaborator.id,
        netSales,
        ticketMedio,
        clientsCount,
        itemsCount,
        unitsCount,
        discountPercent: result?.discountPercent || 0,
      };
    }

    return calculateSellerMetrics(
      collaborator,
      goalConfig,
      effectiveResult,
      getManualDailyOverride(manualDailyRequiredMap, collaborator),
      getManualTicketOverride(manualTicketGoalMap, collaborator)
    );
  });

  // Status semaphore colors
  const getStatusBadge = (status: 'ON_PACE' | 'WARNING' | 'BEHIND') => {
    switch (status) {
      case 'ON_PACE':
        return {
          label: 'No Ritmo / Acima da Meta',
          bg: 'bg-[#00b5ac]/20 border-[#00b5ac]/40 text-[#00b5ac]',
          icon: CheckCircle2,
          color: '#00b5ac',
        };
      case 'WARNING':
        return {
          label: 'Atenção / Leve Atraso',
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
          icon: AlertTriangle,
          color: '#f59e0b',
        };
      case 'BEHIND':
        return {
          label: 'Fora do Ritmo',
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          icon: XCircle,
          color: '#f43f5e',
        };
    }
  };

  const muralRef = useRef<HTMLDivElement>(null);
  const [isExportingMural, setIsExportingMural] = useState(false);

  const handleExportMuralPDF = async () => {
    if (!muralRef.current || isExportingMural) return;
    try {
      setIsExportingMural(true);
      const month = (goalConfig.monthName || 'Mes').replace(/\s+/g, '_');
      const filename = `Mural_Resultados_${month}_Farmacia_Bom_Lar.pdf`;
      await exportElementToPdf(muralRef.current, filename, '#ffffff');
    } catch (error) {
      console.error('Erro ao exportar mural em PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF do mural. Por favor, tente novamente.');
    } finally {
      setIsExportingMural(false);
    }
  };

  const storeStatusBadge = getStatusBadge(storeMetrics.status);
  const StoreStatusIcon = storeStatusBadge.icon;

  // Ring Calculation
  const strokeDasharray = 283; // 2 * pi * 45
  const normalizedPercent = Math.min(100, Math.max(0, storeMetrics.percentAchieved));
  const strokeDashoffset = strokeDasharray - (strokeDasharray * normalizedPercent) / 100;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header Bar & Mural Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#16181d] border border-white/10 rounded-2xl p-4 sm:px-6 shadow-xl">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Award className="w-5 h-5 text-[#00b5ac]" />
            <span>Painel Desempenho da Loja</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Mês: <strong className="text-gray-200">{goalConfig.monthName || 'Atual'}</strong> • Visão consolidada de metas, ritmo e resultados por vendedor
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportMuralPDF}
          disabled={isExportingMural}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#00b5ac] to-[#008d86] hover:from-[#00c7be] hover:to-[#00a39b] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#00b5ac]/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>{isExportingMural ? 'Gerando Mural PDF...' : 'Exportar Mural (PDF)'}</span>
        </button>
      </div>

      {/* Hidden Mural PDF Template Component */}
      <MuralPdfTemplate
        ref={muralRef}
        goalConfig={goalConfig}
        storeMetrics={storeMetrics}
        effectiveStoreDailyRequired={effectiveStoreDailyRequired}
        calculatedSellers={calculatedSellers}
      />

      {/* Top Banner: Store Goal Progress & Semaphore */}
      <div className="relative bg-gradient-to-br from-[#16181d] via-[#1a1c23] to-[#121316] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00b5ac]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#f36e21]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Circular Ring Progress (Estilo Imagem 3) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="42" stroke="#23252d" strokeWidth="10" fill="transparent" />
                {/* Expected Pace Marker line */}
                {storeMetrics.expectedPacePercent > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#ffffff22"
                    strokeWidth="10"
                    strokeDasharray={`${(strokeDasharray * storeMetrics.expectedPacePercent) / 100} ${strokeDasharray}`}
                    fill="transparent"
                  />
                )}
                {/* Actual Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={storeStatusBadge.color}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-black text-white tracking-tight font-mono">
                  {formatPercent(storeMetrics.percentAchieved, 1)}
                </span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                  Desempenho
                </span>
                <span className="text-[10px] text-[#00b5ac] font-mono mt-1">
                  Esperado: {formatPercent(storeMetrics.expectedPacePercent, 1)}
                </span>
              </div>
            </div>

            {/* Semaphore Badge */}
            <div className={`mt-4 px-4 py-2 rounded-2xl border ${storeStatusBadge.bg} flex items-center space-x-2 text-xs font-bold shadow-lg`}>
              <StoreStatusIcon className="w-4 h-4" />
              <span>{storeStatusBadge.label}</span>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Mês de {goalConfig.monthName} — Farmácia
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  Dia {goalConfig.elapsedDays} de {goalConfig.totalBusinessDays} (Resta(m) {storeMetrics.daysRemaining} dias)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatCurrency(storeMetrics.netSales)}{' '}
                <span className="text-xs font-normal text-gray-400">faturado de {formatCurrency(storeMetrics.totalGoal)}</span>
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Daily Sales Needed Card */}
              <div className="bg-[#1e2026] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Venda Diária Necessária</span>
                  <div className="w-7 h-7 rounded-lg bg-[#f36e21]/20 flex items-center justify-center text-[#f36e21]">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  {isEditingStoreDaily ? (
                    <div className="flex items-center space-x-1.5 my-0.5">
                      <span className="text-xl font-extrabold text-white font-mono">R$</span>
                      <input
                        type="text"
                        value={editingStoreDailyValue}
                        onChange={(e) => setEditingStoreDailyValue(e.target.value)}
                        onBlur={handleSaveStoreDailyInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveStoreDailyInput();
                          if (e.key === 'Escape') setIsEditingStoreDaily(false);
                        }}
                        autoFocus
                        className="bg-[#141519] border border-[#f36e21] rounded-lg px-2 py-0.5 text-lg font-extrabold text-white font-mono focus:outline-none w-full max-w-[170px]"
                        placeholder="0,00"
                      />
                    </div>
                  ) : (
                    <p
                      onClick={() => {
                        setIsEditingStoreDaily(true);
                        setEditingStoreDailyValue(
                          effectiveStoreDailyRequired > 0
                            ? effectiveStoreDailyRequired.toFixed(2).replace('.', ',')
                            : ''
                        );
                      }}
                      className="text-xl font-extrabold text-white font-mono cursor-pointer hover:text-[#f36e21] transition-colors inline-block"
                      title="Clique para editar a venda diária necessária"
                    >
                      {formatCurrency(effectiveStoreDailyRequired)}
                    </p>
                  )}

                  <span className="text-[10px] font-normal text-gray-400 block font-sans mt-0.5">
                    / dia para bater a meta
                  </span>

                  {isStoreDailyOverridden && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualStoreDailyRequired?.(null);
                        setIsEditingStoreDaily(false);
                      }}
                      className="text-[11px] text-[#00b5ac] hover:text-[#008d86] font-medium underline mt-2 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Voltar ao cálculo automático</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ticket Médio Loja */}
              <div className="bg-[#1e2026] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Ticket Médio Loja</span>
                  <div className="w-7 h-7 rounded-lg bg-[#00b5ac]/20 flex items-center justify-center text-[#00b5ac]">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-extrabold text-white font-mono">
                  {formatCurrency(storeMetrics.ticketMedio)}
                  <span className="text-[10px] font-normal text-gray-400 block font-sans">
                    Meta: {formatCurrency(storeMetrics.ticketGoal)}
                  </span>
                </p>
              </div>
            </div>

            {/* Non-sellers / Store breakdown note */}
            <div className="p-3.5 rounded-2xl bg-[#121316] border border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#00b5ac]" />
                <span className="text-gray-300">
                  Vendedores:{' '}
                  <strong className="text-white font-mono">{formatCurrency(storeMetrics.sellersNetSales)}</strong> |
                  Gerência/Caixa/Balcão ("Outros"):{' '}
                  <strong className="text-[#00b5ac] font-mono">{formatCurrency(storeMetrics.nonSellersNetSales)}</strong>
                </span>
              </div>
              <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                Outros representam {formatPercent(storeMetrics.nonSellersSharePercent, 1)} das vendas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Sellers Performance Table & Gamified Cards */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-[#f36e21]" />
              <span>Desempenho por Vendedor (Ritmo x Meta Diária)</span>
            </h2>
            <p className="text-xs text-gray-400">Clique em qualquer vendedor para abrir a Apresentação Visual e PDF</p>
          </div>

          <button
            onClick={onGoToEntry}
            className="px-4 py-2 rounded-xl bg-[#1e2026] hover:bg-[#282a32] text-xs font-semibold text-white border border-white/10 transition-all flex items-center space-x-1.5"
          >
            <span>Atualizar Lançamentos</span>
            <ArrowUpRight className="w-4 h-4 text-[#00b5ac]" />
          </button>
        </div>

        {/* Sellers Cards Grid (Estilo Imagem 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {calculatedSellers.map((s) => {
            const hasGoal = s.targetAmount > 0;
            const badge = hasGoal
              ? getStatusBadge(s.status)
              : {
                  label: 'Outros / Balcão',
                  bg: 'bg-gray-500/20 border-gray-500/40 text-gray-300',
                  icon: Users,
                  color: '#9ca3af',
                };
            const BadgeIcon = badge.icon;

            return (
              <div
                key={s.collaborator.id}
                onClick={() => {
                  onSelectSeller(s.collaborator.id);
                }}
                className="group relative bg-[#1a1b20] hover:bg-[#202229] border border-white/10 hover:border-[#00b5ac]/50 cursor-pointer rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-[#00b5ac]/10 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400">Cód: {s.collaborator.code}</span>
                    <h3 className={`text-sm font-extrabold text-white ${s.collaborator.isSeller ? 'group-hover:text-[#00b5ac]' : ''} transition-colors`}>
                      {s.collaborator.name}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-xl border ${badge.bg}`}>
                    <BadgeIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Main Progress Indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">% Bateu da Meta:</span>
                    <span className="font-bold text-white font-mono">
                      {hasGoal ? formatPercent(s.percentAchieved, 1) : 'Sem meta'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-[#121316] rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: hasGoal ? `${Math.min(100, Math.max(0, s.percentAchieved))}%` : '0%',
                        backgroundColor: badge.color,
                      }}
                    />
                  </div>
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Faturamento Atual</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(s.netSales)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Meta Diária Restante</span>
                    <span className="font-mono font-bold text-[#f36e21]">
                      {hasGoal ? `${formatCurrency(s.dailyRequiredSales)}/dia` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Ticket Médio</span>
                    <span className="font-mono font-semibold text-gray-200">
                      {formatCurrency(s.ticketMedio)}{' '}
                      {hasGoal && s.ticketGoal > 0 && (
                        <span className="text-[9px] text-gray-500">(/ Meta {formatCurrency(s.ticketGoal)})</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Clientes Atendidos</span>
                    <span className="font-mono font-semibold text-gray-200">{formatNumber(s.clientsCount)} clis</span>
                  </div>
                </div>

                {s.collaborator.isSeller ? (
                  <div className="text-right">
                    <span className="text-[10px] text-[#00b5ac] font-medium group-hover:underline inline-flex items-center space-x-1">
                      <span>Ver Apresentação & PDF</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-medium">
                      Grupo Consolidado
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
