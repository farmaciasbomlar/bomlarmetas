import React, { useRef, useState } from 'react';
import { Collaborator, GoalConfig, IndividualResult, AIAnalysisSeller } from '../types';
import {
  calculateSellerMetrics,
  getManualDailyOverride,
  getManualTicketOverride,
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
  RotateCcw,
} from 'lucide-react';

interface SellerPresentationCardProps {
  sellers: Collaborator[];
  selectedSellerId: string;
  setSelectedSellerId: (id: string) => void;
  goalConfig: GoalConfig;
  individualResults: Record<string, IndividualResult>;
  aiAnalysisSellers?: AIAnalysisSeller[];
  manualDailyRequiredMap: Record<string, number | null>;
  setManualDailyRequiredMap: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  manualTicketGoalMap: Record<string, number | null>;
  setManualTicketGoalMap: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
}

export const SellerPresentationCard: React.FC<SellerPresentationCardProps> = ({
  sellers,
  selectedSellerId,
  setSelectedSellerId,
  goalConfig,
  individualResults,
  aiAnalysisSellers,
  manualDailyRequiredMap,
  setManualDailyRequiredMap,
  manualTicketGoalMap,
  setManualTicketGoalMap,
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

  const dailyOverride = getManualDailyOverride(manualDailyRequiredMap, currentSeller);
  const ticketOverride = getManualTicketOverride(manualTicketGoalMap, currentSeller);

  const metrics = calculateSellerMetrics(
    currentSeller,
    goalConfig,
    individualResults[currentSeller.id],
    dailyOverride,
    ticketOverride
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

  const [editingDailySellerId, setEditingDailySellerId] = useState<string | null>(null);
  const [editingDailyValue, setEditingDailyValue] = useState<string>('');

  const [editingTicketSellerId, setEditingTicketSellerId] = useState<string | null>(null);
  const [editingTicketValue, setEditingTicketValue] = useState<string>('');

  const isDailyOverridden = dailyOverride !== null && dailyOverride !== undefined;
  const effectiveDailyRequiredSales = metrics.dailyRequiredSales;

  const isTicketOverridden = ticketOverride !== null && ticketOverride !== undefined;
  const effectiveTicketGoal = metrics.ticketGoal;

  const handleSaveDailyInput = () => {
    if (!editingDailySellerId) return;
    const num = parseFormattedNumber(editingDailyValue);
    if (num !== null && num >= 0) {
      const seller = sellers.find((s) => s.id === editingDailySellerId);
      if (seller) {
        setManualDailyRequiredMap((prev) => ({
          ...prev,
          [seller.id]: num,
          ...(seller.code ? { [seller.code]: num } : {}),
        }));
      }
    }
    setEditingDailySellerId(null);
  };

  const handleSaveTicketInput = () => {
    if (!editingTicketSellerId) return;
    const num = parseFormattedNumber(editingTicketValue);
    if (num !== null && num >= 0) {
      const seller = sellers.find((s) => s.id === editingTicketSellerId);
      if (seller) {
        setManualTicketGoalMap((prev) => ({
          ...prev,
          [seller.id]: num,
          ...(seller.code ? { [seller.code]: num } : {}),
        }));
      }
    }
    setEditingTicketSellerId(null);
  };

  const [exportError, setExportError] = useState<string | null>(null);

  // Local state for manager action plan notes per seller
  const [actionNotesMap, setActionNotesMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('pharmametas_action_plan_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Get current seller note from map or localStorage
  const getSellerNote = (seller: Collaborator): string => {
    const keyByCode = seller.code ? seller.code : '';
    const keyById = seller.id ? seller.id : '';

    if (keyByCode && actionNotesMap[keyByCode] !== undefined) return actionNotesMap[keyByCode];
    if (keyById && actionNotesMap[keyById] !== undefined) return actionNotesMap[keyById];

    // Try direct localStorage backup
    if (keyByCode) {
      const saved = localStorage.getItem(`action_plan_${keyByCode}`);
      if (saved) return saved;
    }
    if (keyById) {
      const saved = localStorage.getItem(`action_plan_${keyById}`);
      if (saved) return saved;
    }

    return '';
  };

  const currentNote = getSellerNote(currentSeller);

  const handleNoteChange = (text: string) => {
    const keyToUse = currentSeller.code || currentSeller.id;
    const updatedMap = { ...actionNotesMap, [keyToUse]: text };
    setActionNotesMap(updatedMap);
    try {
      localStorage.setItem('pharmametas_action_plan_notes', JSON.stringify(updatedMap));
      localStorage.setItem(`action_plan_${keyToUse}`, text);
    } catch (err) {
      console.error('Erro ao salvar anotação do plano de ação:', err);
    }
  };

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

              <div>
                {editingDailySellerId === currentSeller.id && !isExportingPDF ? (
                  <div className="flex items-center space-x-2 my-1">
                    <span className="text-2xl font-black text-white font-mono">R$</span>
                    <input
                      type="text"
                      value={editingDailyValue}
                      onChange={(e) => setEditingDailyValue(e.target.value)}
                      onBlur={handleSaveDailyInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDailyInput();
                        if (e.key === 'Escape') setEditingDailySellerId(null);
                      }}
                      autoFocus
                      className="bg-[#141519] border border-[#f36e21] rounded-xl px-3 py-1 text-2xl font-black text-white font-mono focus:outline-none w-full max-w-[220px]"
                      placeholder="0,00"
                    />
                  </div>
                ) : (
                  <p
                    onClick={() => {
                      if (!isExportingPDF) {
                        setEditingDailySellerId(currentSeller.id);
                        setEditingDailyValue(
                          effectiveDailyRequiredSales > 0
                            ? effectiveDailyRequiredSales.toFixed(2).replace('.', ',')
                            : ''
                        );
                      }
                    }}
                    className={`text-3xl font-black text-white font-mono inline-block ${
                      !isExportingPDF ? 'cursor-pointer hover:text-[#f36e21] transition-colors' : ''
                    }`}
                    title={!isExportingPDF ? 'Clique para editar a meta diária' : undefined}
                  >
                    {formatCurrency(effectiveDailyRequiredSales)}
                  </p>
                )}

                <span className="text-xs font-normal text-gray-300 block font-sans mt-0.5">
                  / dia nos {metrics.daysRemaining} dias restantes do mês
                </span>

                {isDailyOverridden && !isExportingPDF && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualDailyRequiredMap((prev) => {
                        const next = { ...prev };
                        delete next[currentSeller.id];
                        if (currentSeller.code) delete next[currentSeller.code];
                        return next;
                      });
                      setEditingDailySellerId(null);
                    }}
                    className="text-[11px] text-[#00b5ac] hover:text-[#008d86] font-medium underline mt-2 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Voltar ao cálculo automático</span>
                  </button>
                )}
              </div>
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
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <p className="text-2xl font-extrabold text-white font-mono">
                  {formatCurrency(metrics.ticketMedio)}
                </p>

                <div className="flex flex-col items-end">
                  {editingTicketSellerId === currentSeller.id && !isExportingPDF ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-mono text-gray-400">Meta: R$</span>
                      <input
                        type="text"
                        value={editingTicketValue}
                        onChange={(e) => setEditingTicketValue(e.target.value)}
                        onBlur={handleSaveTicketInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTicketInput();
                          if (e.key === 'Escape') setEditingTicketSellerId(null);
                        }}
                        autoFocus
                        className="bg-[#141519] border border-[#00b5ac] rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none w-24"
                        placeholder="0,00"
                      />
                    </div>
                  ) : (
                    <span
                      onClick={() => {
                        if (!isExportingPDF) {
                          setEditingTicketSellerId(currentSeller.id);
                          setEditingTicketValue(
                            effectiveTicketGoal > 0
                              ? effectiveTicketGoal.toFixed(2).replace('.', ',')
                              : ''
                          );
                        }
                      }}
                      className={`text-xs font-mono text-gray-400 ${
                        !isExportingPDF ? 'cursor-pointer hover:text-[#00b5ac] transition-colors' : ''
                      }`}
                      title={!isExportingPDF ? 'Clique para editar a meta de ticket médio' : undefined}
                    >
                      Meta: <span className="font-bold text-white text-[18px] leading-[18px]" style={{ fontSize: '18px', lineHeight: '18px' }}>{formatCurrency(effectiveTicketGoal)}</span>
                    </span>
                  )}

                  {isTicketOverridden && !isExportingPDF && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualTicketGoalMap((prev) => {
                          const next = { ...prev };
                          delete next[currentSeller.id];
                          if (currentSeller.code) delete next[currentSeller.code];
                          return next;
                        });
                        setEditingTicketSellerId(null);
                      }}
                      className="text-[10px] text-[#00b5ac] hover:text-[#008d86] font-medium underline mt-1 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Voltar ao cálculo automático</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full h-2 bg-[#23252d] rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#00b5ac] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (metrics.ticketMedio / (effectiveTicketGoal || 1)) * 100)}%`,
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

        {/* Manager AI Script & Tip Box (Omitted in PDF export) */}
        {sellerAI && !isExportingPDF && (
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

        {/* PLANO DE AÇÃO — COMBINADO COM O VENDEDOR */}
        {(!isExportingPDF || currentNote.trim().length > 0) && (
          <div className="relative z-10 bg-[#121316]/90 border border-[#00b5ac] rounded-3xl p-6 space-y-3 shadow-xl w-full max-w-full overflow-hidden box-border">
            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center space-x-2 min-w-0">
                <FileText className="w-5 h-5 text-[#00b5ac] shrink-0" />
                <h3 className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider">
                  📝 PLANO DE AÇÃO — COMBINADO COM O VENDEDOR
                </h3>
              </div>
              <span className="text-[10px] bg-[#f36e21]/20 text-[#f36e21] px-2 py-0.5 rounded font-mono font-bold border border-[#f36e21]/30 shrink-0">
                Anotações do Gerente
              </span>
            </div>

            {isExportingPDF ? (
              <div
                className="bg-[#1a1c22] text-white text-xs leading-relaxed p-4 rounded-2xl border border-white/10 font-sans w-full max-w-full box-border"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {currentNote}
              </div>
            ) : (
              <div className="space-y-2 w-full max-w-full box-border">
                <textarea
                  value={currentNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Anote aqui o que foi conversado e combinado com o(a) vendedor(a): melhorias de comportamento, metas de rotação, foco para os próximos dias..."
                  rows={4}
                  className="w-full bg-[#1a1c22] border border-white/15 rounded-2xl p-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#f36e21] transition-colors leading-relaxed font-sans resize-y min-h-[110px] box-border"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                />
                <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                  <span>
                    Vincular e salvar para:{' '}
                    <strong className="text-white">
                      {currentSeller.code ? `[${currentSeller.code}] ` : ''}
                      {currentSeller.name}
                    </strong>
                  </span>
                  <span className="text-[#00b5ac] font-medium">
                    {currentNote.trim().length > 0 ? '✓ Salvo localmente' : 'Digite para salvar'}
                  </span>
                </div>
              </div>
            )}
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
