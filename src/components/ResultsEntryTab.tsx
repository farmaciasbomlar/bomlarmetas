import React, { useState, useEffect } from 'react';
import {
  Collaborator,
  IndividualResult,
  StoreResult,
  GoalConfig,
  AIAnalysisResponse,
  TeamRole,
} from '../types';
import { formatCurrency } from '../utils/calculations';
import {
  Camera,
  Edit3,
  Upload,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  BarChart3,
  Trash2,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Layers,
  Clipboard,
  RefreshCw,
} from 'lucide-react';

interface ResultsEntryTabProps {
  collaborators: Collaborator[];
  setCollaborators?: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  goalConfig: GoalConfig;
  setGoalConfig?: React.Dispatch<React.SetStateAction<GoalConfig>>;
  individualResults: Record<string, IndividualResult>;
  setIndividualResults: React.Dispatch<React.SetStateAction<Record<string, IndividualResult>>>;
  storeResult: StoreResult;
  setStoreResult: React.Dispatch<React.SetStateAction<StoreResult>>;
  setAiAnalysis?: React.Dispatch<React.SetStateAction<AIAnalysisResponse | null>>;
  onAfterConfirmResults?: () => void;
}

export interface DualPrintRow {
  code: string;
  name: string;
  netSales: number; // Venda Líquida (R$)
  targetAmount: number; // Meta (R$)
  hasGoal: boolean;
  ticketMedio?: number;
  clientsCount?: number;
  itemsCount?: number;
  unitsCount?: number;
  discountPercent?: number;
  grossSales?: number;
  discountAmount?: number;
}

export interface DualPrintAnalysis {
  sellerTicketGoal: number; // Meta Ticket Médio Vendedor
  storeTicketGoal: number; // Meta Ticket Médio Loja
  sellers: DualPrintRow[];
  outros: {
    count: number;
    totalNetSales: number;
    targetAmount: number;
    hasGoal: boolean;
    itemsCount: number;
    unitsCount: number;
    clientsCount: number;
    ticketMedio: number;
    collaborators: Array<{ code: string; name: string; netSales: number }>;
  };
  storeTotal: {
    netSales: number;
    totalGoal: number;
    ticketMedio: number;
    clientsCount: number;
    itemsCount: number;
    unitsCount: number;
    discountPercent: number;
  };
}

export const ResultsEntryTab: React.FC<ResultsEntryTabProps> = ({
  collaborators,
  setCollaborators,
  goalConfig,
  setGoalConfig,
  individualResults,
  setIndividualResults,
  storeResult,
  setStoreResult,
  setAiAnalysis,
  onAfterConfirmResults,
}) => {
  const [entryMode, setEntryMode] = useState<'ocr' | 'manual'>('ocr');

  // Input fields for Business Days
  const [elapsedDaysInput, setElapsedDaysInput] = useState<number>(goalConfig.elapsedDays || 10);
  const [totalBusinessDaysInput, setTotalBusinessDaysInput] = useState<number>(
    goalConfig.totalBusinessDays || 26
  );

  // Images state
  const [goalsImage, setGoalsImage] = useState<string | null>(null);
  const [performanceImage, setPerformanceImage] = useState<string | null>(null);

  // Processing & Analysis state
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DualPrintAnalysis | null>(null);

  // Sync business days input with parent goalConfig if changed externally
  useEffect(() => {
    setElapsedDaysInput(goalConfig.elapsedDays);
    setTotalBusinessDaysInput(goalConfig.totalBusinessDays);
  }, [goalConfig.elapsedDays, goalConfig.totalBusinessDays]);

  // Read file as base64 helper
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Upload handler for Goals Image
  const handleGoalsFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setGoalsImage(base64);
      setOcrError(null);
    } catch (err: any) {
      setOcrError('Erro ao carregar imagem da planilha de metas.');
    }
  };

  // Upload handler for Performance Image
  const handlePerformanceFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setPerformanceImage(base64);
      setOcrError(null);
    } catch (err: any) {
      setOcrError('Erro ao carregar imagem de desempenho.');
    }
  };

  // Paste image from clipboard handler
  const handlePasteFromClipboard = async (target: 'goals' | 'performance') => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('Seu navegador não suporta a leitura direta do clipboard. Use Ctrl+V após focar na tela.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image.png', { type: imageType });
          if (target === 'goals') {
            await handleGoalsFileUpload(file);
          } else {
            await handlePerformanceFileUpload(file);
          }
          return;
        }
      }
      alert('Nenhuma imagem encontrada na área de transferência.');
    } catch (err) {
      console.error(err);
      alert('Para colar a imagem, selecione a área e pressione Ctrl+V (ou Cmd+V).');
    }
  };

  // Global paste handler when in OCR mode
  const handleGlobalPaste = (e: React.ClipboardEvent) => {
    if (entryMode !== 'ocr') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // If goals is empty, assign to goals. Otherwise assign to performance.
          if (!goalsImage) {
            handleGoalsFileUpload(file);
          } else {
            handlePerformanceFileUpload(file);
          }
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Normalize code by stripping leading zeros and mapping '0', '00', 'OUTROS' to '0'
  const normalizeCode = (code: string | number | undefined | null): string => {
    if (code === undefined || code === null) return '';
    const str = String(code).trim();
    if (str === '0' || str === '00' || str.toUpperCase() === 'OUTROS') return '0';
    const stripped = str.replace(/^0+/, '');
    return stripped || '0';
  };

  // Execute Dual Print OCR Process
  const handleProcessOCR = async () => {
    if (!goalsImage && !performanceImage) {
      setOcrError('Por favor, carregue ao menos um dos dois prints para processamento.');
      return;
    }

    setIsProcessing(true);
    setOcrError(null);

    try {
      const response = await fetch('/api/ocr-dual-prints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalsImageBase64: goalsImage,
          performanceImageBase64: performanceImage,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao processar as imagens via OCR.';
        try {
          const errText = await response.text();
          const errJson = JSON.parse(errText);
          errorMsg = errJson.error || errJson.details || errorMsg;
        } catch {
          errorMsg = `Erro no servidor (${response.status} ${response.statusText}). Verifique se a chave de API ou conexão está configurada.`;
        }
        throw new Error(errorMsg);
      }

      const rawData = await response.json();
      const goalsSheet: Array<{ code: string; name: string; targetAmount: number }> =
        rawData.goalsSheet || [];
      const performanceSheet: Array<{
        code: string;
        name: string;
        grossSales?: number;
        discountAmount?: number;
        discountPercent?: number;
        netSales: number;
        items?: number;
        units?: number;
        clients?: number;
        ticketMedio?: number;
      }> = rawData.performanceSheet || [];
      const storeTotal = rawData.storeTotal || {};

      // Map goalsSheet by normalized code
      const goalMap = new Map<string, { code: string; name: string; targetAmount: number }>();
      goalsSheet.forEach((g) => {
        let norm = normalizeCode(g.code);
        const nameUpper = (g.name || '').toUpperCase();
        if (!norm || norm === '0' || nameUpper.includes('OUTROS') || nameUpper.includes('BALCÃO') || nameUpper.includes('GERÊNCIA')) {
          if (!g.code || g.code === '0' || g.code === '00' || g.code.toUpperCase() === 'OUTROS' || nameUpper.includes('OUTROS') || nameUpper.includes('BALCÃO') || nameUpper.includes('GERÊNCIA')) {
            norm = '0';
          }
        }
        if (norm) {
          goalMap.set(norm, {
            code: norm === '0' ? '0' : g.code,
            name: g.name || 'GERÊNCIA / CAIXA / OUTROS',
            targetAmount: Number(g.targetAmount) || 0,
          });
        }
      });

      const matchedGoalCodes = new Set<string>();
      const processedSellers: DualPrintRow[] = [];
      const outrosList: Array<{ code: string; name: string; netSales: number }> = [];

      let outrosNetSales = 0;
      let outrosItems = 0;
      let outrosUnits = 0;
      let outrosClients = 0;

      // Process performanceSheet rows
      performanceSheet.forEach((p) => {
        const normCode = normalizeCode(p.code);
        // Only match individual seller if normCode is NOT '0'
        const matchedGoal = normCode !== '0' ? goalMap.get(normCode) : undefined;
        const netSales = Number(p.netSales) || 0;

        if (matchedGoal) {
          matchedGoalCodes.add(normCode);
          processedSellers.push({
            code: matchedGoal.code || p.code,
            name: matchedGoal.name || p.name,
            netSales: netSales, // ALWAYS VENDA LÍQUIDA
            targetAmount: matchedGoal.targetAmount,
            hasGoal: true,
            ticketMedio: Number(p.ticketMedio) || (p.clients ? netSales / p.clients : 0),
            clientsCount: Number(p.clients) || 0,
            itemsCount: Number(p.items) || 0,
            unitsCount: Number(p.units) || 0,
            discountPercent: Number(p.discountPercent) || 0,
            grossSales: Number(p.grossSales) || netSales,
            discountAmount: Number(p.discountAmount) || 0,
          });
        } else {
          // Grouped into "OUTROS"
          outrosList.push({
            code: p.code,
            name: p.name,
            netSales: netSales,
          });
          outrosNetSales += netSales;
          outrosItems += Number(p.items) || 0;
          outrosUnits += Number(p.units) || 0;
          outrosClients += Number(p.clients) || 0;
        }
      });

      // Include sellers from goalMap who had no sales registered in performanceSheet yet (excluding code '0')
      goalMap.forEach((g, normCode) => {
        if (normCode !== '0' && !matchedGoalCodes.has(normCode)) {
          processedSellers.push({
            code: g.code,
            name: g.name,
            netSales: 0,
            targetAmount: g.targetAmount,
            hasGoal: true,
            ticketMedio: 0,
            clientsCount: 0,
            itemsCount: 0,
            unitsCount: 0,
            discountPercent: 0,
          });
        }
      });

      // Check for OUTROS goal (code '0')
      const outrosGoal = goalMap.get('0');
      const outrosTargetAmount = outrosGoal ? outrosGoal.targetAmount : 0;
      const hasOutrosGoal = !!outrosGoal && outrosTargetAmount > 0;

      // Calculate store totals and extracted ticket goals
      const totalSellersNetSales = processedSellers.reduce((acc, s) => acc + s.netSales, 0);
      const totalStoreNetSales = Number(storeTotal.netSales) || (totalSellersNetSales + outrosNetSales);
      const totalStoreGoal = goalsSheet.reduce((acc, g) => acc + (Number(g.targetAmount) || 0), 0);

      const sellerTicketGoal = Number(rawData.sellerTicketGoal) || 0;
      const storeTicketGoal = Number(rawData.storeTicketGoal) || 0;

      const dualAnalysis: DualPrintAnalysis = {
        sellerTicketGoal,
        storeTicketGoal,
        sellers: processedSellers,
        outros: {
          count: outrosList.length,
          totalNetSales: outrosNetSales,
          targetAmount: outrosTargetAmount,
          hasGoal: hasOutrosGoal,
          itemsCount: outrosItems,
          unitsCount: outrosUnits,
          clientsCount: outrosClients,
          ticketMedio: outrosClients > 0 ? outrosNetSales / outrosClients : 0,
          collaborators: outrosList,
        },
        storeTotal: {
          netSales: totalStoreNetSales,
          totalGoal: totalStoreGoal,
          ticketMedio: Number(storeTotal.ticketMedio) || (outrosClients + processedSellers.reduce((a, b) => a + b.clientsCount!, 0) > 0 ? totalStoreNetSales / (outrosClients + processedSellers.reduce((a, b) => a + b.clientsCount!, 0)) : 0),
          clientsCount: Number(storeTotal.clients) || (outrosClients + processedSellers.reduce((a, b) => a + b.clientsCount!, 0)),
          itemsCount: Number(storeTotal.items) || (outrosItems + processedSellers.reduce((a, b) => a + b.itemsCount!, 0)),
          unitsCount: Number(storeTotal.units) || (outrosUnits + processedSellers.reduce((a, b) => a + b.unitsCount!, 0)),
          discountPercent: Number(storeTotal.discountPercent) || 0,
        },
      };

      setAnalysisResult(dualAnalysis);
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || 'Falha ao analisar as imagens via IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and Apply Data to main application state (CRITICAL ISOLATION RULE)
  const handleConfirmAndApply = () => {
    if (!analysisResult) return;

    const elapsedDays = Math.max(1, elapsedDaysInput);
    const totalBusinessDays = Math.max(elapsedDays, totalBusinessDaysInput);

    // 1. Create NEW Collaborators list from zero with the extracted sellerTicketGoal
    const newCollaborators: Collaborator[] = analysisResult.sellers.map((s) => ({
      id: `seller-${s.code}`,
      code: s.code,
      name: s.name,
      isSeller: true,
      role: 'Vendedor' as TeamRole,
      weightPercent:
        analysisResult.storeTotal.totalGoal > 0
          ? (s.targetAmount / analysisResult.storeTotal.totalGoal) * 100
          : 0,
      ticketGoal: analysisResult.sellerTicketGoal || 0,
    }));

    // Calculate OUTROS target and weightPercent from code 0
    const outrosTarget = analysisResult.outros.targetAmount || 0;
    const storeTotalGoal = analysisResult.storeTotal.totalGoal || 0;
    const outrosWeight = storeTotalGoal > 0 ? (outrosTarget / storeTotalGoal) * 100 : 0;

    // Add OUTROS entry to collaborators
    newCollaborators.push({
      id: 'seller-outros',
      code: '0',
      name: 'GERÊNCIA / CAIXA / OUTROS',
      isSeller: false,
      role: 'Outros' as TeamRole,
      weightPercent: outrosWeight,
      ticketGoal: 0,
    });

    // 2. Build NEW individualResults map
    const newIndividualResults: Record<string, IndividualResult> = {};
    analysisResult.sellers.forEach((s) => {
      newIndividualResults[`seller-${s.code}`] = {
        collaboratorId: `seller-${s.code}`,
        netSales: s.netSales, // ALWAYS VENDA LÍQUIDA
        ticketMedio: s.ticketMedio || 0,
        clientsCount: s.clientsCount || 0,
        itemsCount: s.itemsCount || 0,
        unitsCount: s.unitsCount || 0,
        discountPercent: s.discountPercent || 0,
        grossSales: s.grossSales || s.netSales,
        discountAmount: s.discountAmount || 0,
      };
    });

    newIndividualResults['seller-outros'] = {
      collaboratorId: 'seller-outros',
      netSales: analysisResult.outros.totalNetSales, // ALWAYS VENDA LÍQUIDA
      ticketMedio: analysisResult.outros.ticketMedio || 0,
      clientsCount: analysisResult.outros.clientsCount || 0,
      itemsCount: analysisResult.outros.itemsCount || 0,
      unitsCount: analysisResult.outros.unitsCount || 0,
      discountPercent: 0,
    };

    // 3. Build NEW StoreResult
    const newStoreResult: StoreResult = {
      netSales: analysisResult.storeTotal.netSales,
      ticketMedio: analysisResult.storeTotal.ticketMedio,
      clientsCount: analysisResult.storeTotal.clientsCount,
      itemsCount: analysisResult.storeTotal.itemsCount,
      unitsCount: analysisResult.storeTotal.unitsCount,
      discountPercent: analysisResult.storeTotal.discountPercent,
    };

    // 4. Update Parent State (Full Reset according to Isolation Rule)
    if (setCollaborators) setCollaborators(newCollaborators);
    setIndividualResults(newIndividualResults);
    setStoreResult(newStoreResult);

    if (setGoalConfig) {
      setGoalConfig({
        ...goalConfig,
        totalGoal: analysisResult.storeTotal.totalGoal,
        defaultSellerTicketGoal: analysisResult.sellerTicketGoal || 0,
        storeTicketGoal: analysisResult.storeTicketGoal || 0,
        elapsedDays: elapsedDays,
        totalBusinessDays: totalBusinessDays,
      });
    }

    // Reset old AI analysis to ensure fresh diagnosis can be generated
    if (setAiAnalysis) setAiAnalysis(null);

    // Call callback to navigate to dashboard
    if (onAfterConfirmResults) {
      onAfterConfirmResults();
    }
  };

  // Helper calculation values for projections
  const elapsedDays = Math.max(1, elapsedDaysInput);
  const totalBusinessDays = Math.max(elapsedDays, totalBusinessDaysInput);

  const calculatePaceAndProjection = (netSales: number, targetAmount: number) => {
    const dailyPace = netSales / elapsedDays;
    const projectedSales = dailyPace * totalBusinessDays;
    const remainingGoal = Math.max(0, targetAmount - netSales);
    const percentAchieved = targetAmount > 0 ? (netSales / targetAmount) * 100 : 0;
    const isOnTrack = targetAmount > 0 ? projectedSales >= targetAmount : true;
    return { dailyPace, projectedSales, remainingGoal, percentAchieved, isOnTrack };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16" onPaste={handleGlobalPaste}>
      {/* Top Header & Mode Switcher */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00b5ac]/20 text-[#00b5ac] border border-[#00b5ac]/30 uppercase tracking-wider">
                Bom Lar Resultados
              </span>
              <h2 className="text-lg font-bold text-white">Lançar e Analisar Resultados</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Envie os prints da Planilha de Metas e do Desempenho ou faça o lançamento manual.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-[#1e2026] p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setEntryMode('ocr')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                entryMode === 'ocr'
                  ? 'bg-gradient-to-r from-[#00b5ac] to-[#008d86] text-white shadow-lg shadow-[#00b5ac]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Análise por Prints (OCR IA)</span>
            </button>

            <button
              onClick={() => setEntryMode('manual')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                entryMode === 'manual'
                  ? 'bg-gradient-to-r from-[#f36e21] to-[#e05c10] text-white shadow-lg shadow-[#f36e21]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Lançamento Manual</span>
            </button>
          </div>
        </div>

        {/* Global Business Days & Month Input Card */}
        <div className="mt-6 p-4 rounded-2xl bg-[#1e2026] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-[#00b5ac]" />
              <span>Mês Vigente</span>
            </label>
            <select
              value={goalConfig.monthName || 'Julho'}
              onChange={(e) => {
                if (setGoalConfig) {
                  setGoalConfig({ ...goalConfig, monthName: e.target.value });
                }
              }}
              className="w-full bg-[#121316] border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white font-sans font-bold focus:border-[#00b5ac] focus:outline-none cursor-pointer"
            >
              {[
                'Janeiro',
                'Fevereiro',
                'Março',
                'Abril',
                'Maio',
                'Junho',
                'Julho',
                'Agosto',
                'Setembro',
                'Outubro',
                'Novembro',
                'Dezembro',
              ].map((m) => (
                <option key={m} value={m} className="bg-[#121316] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-[#00b5ac]" />
              <span>Dias úteis já passados no mês</span>
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={elapsedDaysInput}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setElapsedDaysInput(val);
                if (setGoalConfig) {
                  setGoalConfig({ ...goalConfig, elapsedDays: val });
                }
              }}
              className="w-full bg-[#121316] border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:border-[#00b5ac] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-[#f36e21]" />
              <span>Total de dias úteis do mês</span>
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={totalBusinessDaysInput}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setTotalBusinessDaysInput(val);
                if (setGoalConfig) {
                  setGoalConfig({ ...goalConfig, totalBusinessDays: val });
                }
              }}
              className="w-full bg-[#121316] border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:border-[#f36e21] focus:outline-none"
            />
          </div>
        </div>

        {/* OCR MODE */}
        {entryMode === 'ocr' && (
          <div className="mt-6 space-y-6">
            <div className="p-4 rounded-2xl bg-[#1e2026] border border-white/5 flex items-start space-x-3 text-xs text-gray-300">
              <Sparkles className="w-5 h-5 text-[#00b5ac] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Análise Dupla por IA:</span> Carregue o print da{' '}
                <strong className="text-[#00b5ac]">Planilha de Metas</strong> e o print de{' '}
                <strong className="text-[#f36e21]">Desempenho por Colaborador</strong>. A IA fará o cruzamento automático pelo código do vendedor (ex: 0727 = 727) e usará a <strong className="text-white">Venda Líquida</strong> para calcular o ritmo e a projeção de fechamento.
              </div>
            </div>

            {/* TWO SEPARATE UPLOAD FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FIELD 1: PLANILHA DE METAS */}
              <div className="bg-[#121316] border border-white/10 rounded-3xl p-5 space-y-4 hover:border-[#00b5ac]/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-[#00b5ac]/20 border border-[#00b5ac]/40 flex items-center justify-center text-[#00b5ac]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">1. Planilha de Metas</h3>
                        <p className="text-[11px] text-gray-400">Print com código do vendedor e meta em R$</p>
                      </div>
                    </div>
                    {goalsImage && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Carregado</span>
                      </span>
                    )}
                  </div>

                  {!goalsImage ? (
                    <div className="relative border-2 border-dashed border-white/15 hover:border-[#00b5ac] rounded-2xl p-6 text-center transition-all bg-[#1a1b20] group cursor-pointer my-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isProcessing}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleGoalsFileUpload(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="w-7 h-7 text-[#00b5ac] group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-white">Clique ou arraste o print da Planilha de Metas</p>
                        <p className="text-[10px] text-gray-400">Suporta JPG, PNG ou cole via Ctrl+V</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-[#1a1b20] my-2 group">
                      <img
                        src={goalsImage}
                        alt="Print da Planilha de Metas"
                        className="w-full h-40 object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex items-end justify-between">
                        <span className="text-[11px] font-semibold text-white truncate max-w-[200px]">
                          Print Planilha de Metas
                        </span>
                        <button
                          onClick={() => setGoalsImage(null)}
                          className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors"
                          title="Remover Imagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handlePasteFromClipboard('goals')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium border border-white/10 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#00b5ac]" />
                    <span>Colar do Clipboard</span>
                  </button>
                </div>
              </div>

              {/* FIELD 2: DESEMPENHO POR COLABORADOR */}
              <div className="bg-[#121316] border border-white/10 rounded-3xl p-5 space-y-4 hover:border-[#f36e21]/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-[#f36e21]/20 border border-[#f36e21]/40 flex items-center justify-center text-[#f36e21]">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">2. Desempenho por Colaborador</h3>
                        <p className="text-[11px] text-gray-400">Print do Relatório 802 com Venda Líquida</p>
                      </div>
                    </div>
                    {performanceImage && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Carregado</span>
                      </span>
                    )}
                  </div>

                  {!performanceImage ? (
                    <div className="relative border-2 border-dashed border-white/15 hover:border-[#f36e21] rounded-2xl p-6 text-center transition-all bg-[#1a1b20] group cursor-pointer my-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isProcessing}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handlePerformanceFileUpload(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="w-7 h-7 text-[#f36e21] group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-white">Clique ou arraste o print de Desempenho</p>
                        <p className="text-[10px] text-gray-400">Suporta JPG, PNG ou cole via Ctrl+V</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-[#1a1b20] my-2 group">
                      <img
                        src={performanceImage}
                        alt="Print de Desempenho"
                        className="w-full h-40 object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex items-end justify-between">
                        <span className="text-[11px] font-semibold text-white truncate max-w-[200px]">
                          Print Desempenho por Colaborador
                        </span>
                        <button
                          onClick={() => setPerformanceImage(null)}
                          className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors"
                          title="Remover Imagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handlePasteFromClipboard('performance')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium border border-white/10 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#f36e21]" />
                    <span>Colar do Clipboard</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {ocrError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {/* ACTION BUTTON TO PROCESS OCR */}
            <div className="flex justify-center pt-2">
              <button
                disabled={isProcessing || (!goalsImage && !performanceImage)}
                onClick={handleProcessOCR}
                className={`px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center space-x-2 transition-all shadow-xl ${
                  isProcessing || (!goalsImage && !performanceImage)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-[#00b5ac] via-[#008d86] to-[#f36e21] text-white hover:opacity-95 shadow-[#00b5ac]/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando e Cruzando Dados com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analisar e Cruzar Prints com IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MANUAL ENTRY MODE */}
        {entryMode === 'manual' && (
          <div className="mt-6 space-y-6">
            <div className="bg-[#1a1b20] p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider">Total Geral da Loja</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Venda Líquida (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.netSales}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, netSales: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#00b5ac] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Ticket Médio (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.ticketMedio}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, ticketMedio: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Clientes</label>
                  <input
                    type="number"
                    value={storeResult.clientsCount}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, clientsCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Itens</label>
                  <input
                    type="number"
                    value={storeResult.itemsCount}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, itemsCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Unidades</label>
                  <input
                    type="number"
                    value={storeResult.unitsCount}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, unitsCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">% Desconto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.discountPercent || 0}
                    onChange={(e) =>
                      setStoreResult({ ...storeResult, discountPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Individual Seller Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Resultados Individuais por Colaborador
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1a1b20] text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Cód.</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3">Venda Líquida (R$)</th>
                      <th className="py-2.5 px-3">Ticket Médio (R$)</th>
                      <th className="py-2.5 px-3">Clientes</th>
                      <th className="py-2.5 px-3">Itens</th>
                      <th className="py-2.5 px-3">% Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {collaborators.map((collab) => {
                      const res = individualResults[collab.id] || {
                        collaboratorId: collab.id,
                        netSales: 0,
                        ticketMedio: 0,
                        clientsCount: 0,
                        itemsCount: 0,
                        unitsCount: 0,
                        discountPercent: 0,
                      };

                      return (
                        <tr key={collab.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-gray-400">{collab.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{collab.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-gray-300">
                              {collab.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.netSales}
                              onChange={(e) => {
                                setIndividualResults({
                                  ...individualResults,
                                  [collab.id]: {
                                    ...res,
                                    netSales: parseFloat(e.target.value) || 0,
                                  },
                                });
                              }}
                              className="w-24 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono font-semibold focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.ticketMedio}
                              onChange={(e) => {
                                setIndividualResults({
                                  ...individualResults,
                                  [collab.id]: {
                                    ...res,
                                    ticketMedio: parseFloat(e.target.value) || 0,
                                  },
                                });
                              }}
                              className="w-20 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              value={res.clientsCount}
                              onChange={(e) => {
                                setIndividualResults({
                                  ...individualResults,
                                  [collab.id]: {
                                    ...res,
                                    clientsCount: parseInt(e.target.value) || 0,
                                  },
                                });
                              }}
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              value={res.itemsCount}
                              onChange={(e) => {
                                setIndividualResults({
                                  ...individualResults,
                                  [collab.id]: {
                                    ...res,
                                    itemsCount: parseInt(e.target.value) || 0,
                                  },
                                });
                              }}
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.discountPercent || 0}
                              onChange={(e) => {
                                setIndividualResults({
                                  ...individualResults,
                                  [collab.id]: {
                                    ...res,
                                    discountPercent: parseFloat(e.target.value) || 0,
                                  },
                                });
                              }}
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (onAfterConfirmResults) onAfterConfirmResults();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00b5ac] to-[#008d86] text-white text-xs font-semibold shadow-lg shadow-[#00b5ac]/20 flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Atualizar Painel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ANALYSIS RESULT SECTION (SAÍDA DA ANÁLISE) */}
      {entryMode === 'ocr' && analysisResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* STORE RESUME CARD */}
          <div className="bg-[#141519] border border-[#00b5ac]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00b5ac]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00b5ac]/10 border border-[#00b5ac]/30 flex items-center justify-center text-[#00b5ac]">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Resultado da Análise da Loja</h3>
                  <p className="text-xs text-gray-400">
                    Calculado para {elapsedDays} de {totalBusinessDays} dias úteis
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {(() => {
                const storePace = calculatePaceAndProjection(
                  analysisResult.storeTotal.netSales,
                  analysisResult.storeTotal.totalGoal
                );
                return storePace.isOnTrack ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>🟢 No Ritmo (Projeção Atinge a Meta)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center space-x-1.5">
                    <TrendingDown className="w-4 h-4" />
                    <span>🔴 Abaixo do Ritmo (Requer Ajuste)</span>
                  </span>
                );
              })()}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Venda Líquida Total</p>
                <p className="text-lg font-bold text-[#00b5ac] font-mono mt-1">
                  {formatCurrency(analysisResult.storeTotal.netSales)}
                </p>
              </div>

              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Meta Total da Loja</p>
                <p className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(analysisResult.storeTotal.totalGoal)}
                </p>
              </div>

              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">% Atingimento Global</p>
                {(() => {
                  const pct =
                    analysisResult.storeTotal.totalGoal > 0
                      ? (analysisResult.storeTotal.netSales / analysisResult.storeTotal.totalGoal) * 100
                      : 0;
                  return (
                    <p className={`text-lg font-bold font-mono mt-1 ${pct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pct.toFixed(1)}%
                    </p>
                  );
                })()}
              </div>

              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Projeção de Fechamento</p>
                {(() => {
                  const proj = (analysisResult.storeTotal.netSales / elapsedDays) * totalBusinessDays;
                  return (
                    <p className="text-lg font-bold text-sky-400 font-mono mt-1">
                      {formatCurrency(proj)}
                    </p>
                  );
                })()}
              </div>

              <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5 col-span-2 md:col-span-1">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Falta para a Meta</p>
                {(() => {
                  const rem = Math.max(0, analysisResult.storeTotal.totalGoal - analysisResult.storeTotal.netSales);
                  return (
                    <p className="text-lg font-bold text-[#f36e21] font-mono mt-1">
                      {formatCurrency(rem)}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* SEPARATE TICKET MÉDIO GOALS SECTION */}
            <div className="mt-6 p-4 rounded-2xl bg-[#1a1b20] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-[#00b5ac]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Metas de Ticket Médio Lidas no Print
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  Reescritas e isoladas a cada novo print enviado
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Field 1: Ticket Médio Meta (Vendedor) */}
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200">
                      Ticket Médio Meta (Vendedor)
                    </label>
                    <span className="text-[10px] bg-[#00b5ac]/20 text-[#00b5ac] px-2 py-0.5 rounded font-mono font-bold border border-[#00b5ac]/30">
                      Meta por Vendedor
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-400 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={analysisResult.sellerTicketGoal || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAnalysisResult({
                          ...analysisResult,
                          sellerTicketGoal: val,
                        });
                      }}
                      className="w-full bg-[#1e2026] border border-white/15 rounded-lg px-3 py-1.5 text-sm font-bold text-[#00b5ac] font-mono focus:border-[#00b5ac] focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Comparado individualmente com o ticket realizado por cada vendedor.
                  </p>
                </div>

                {/* Field 2: Ticket Médio Meta (Loja) */}
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200">
                      Ticket Médio Meta (Loja)
                    </label>
                    <span className="text-[10px] bg-[#f36e21]/20 text-[#f36e21] px-2 py-0.5 rounded font-mono font-bold border border-[#f36e21]/30">
                      Meta Geral Loja
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-400 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={analysisResult.storeTicketGoal || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAnalysisResult({
                          ...analysisResult,
                          storeTicketGoal: val,
                        });
                      }}
                      className="w-full bg-[#1e2026] border border-white/15 rounded-lg px-3 py-1.5 text-sm font-bold text-[#f36e21] font-mono focus:border-[#f36e21] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-gray-400">
                      Realizado Loja: <strong className="text-white font-mono">{formatCurrency(analysisResult.storeTotal.ticketMedio)}</strong>
                    </span>
                    {analysisResult.storeTotal.ticketMedio >= (analysisResult.storeTicketGoal || 0) ? (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ✓ Loja Atingiu Meta Ticket
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        ⚠ Loja Abaixo da Meta Ticket
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DETAILED TABLE BY SELLER */}
          <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Análise por Vendedor & Projeção</h3>
                <p className="text-xs text-gray-400">
                  Valores apurados pela Venda Líquida e cruzamento automático de código
                </p>
              </div>

              <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {analysisResult.sellers.length} vendedores cadastrados com meta
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1a1b20] text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-3">Cód.</th>
                    <th className="py-3 px-3">Vendedor</th>
                    <th className="py-3 px-3 font-semibold text-[#00b5ac]">Venda Líquida</th>
                    <th className="py-3 px-3 font-semibold text-white">Meta Individual</th>
                    <th className="py-3 px-3 text-center">% Venda</th>
                    <th className="py-3 px-3 text-amber-300">Ticket Realizado</th>
                    <th className="py-3 px-3 text-gray-300">Ticket Meta (Vendedor)</th>
                    <th className="py-3 px-3 text-center">Status Ticket</th>
                    <th className="py-3 px-3 text-sky-400">Projeção Fechamento</th>
                    <th className="py-3 px-3 text-[#f36e21]">Falta p/ Meta</th>
                    <th className="py-3 px-3 text-center">Ritmo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {analysisResult.sellers.map((seller) => {
                    const { dailyPace, projectedSales, remainingGoal, percentAchieved, isOnTrack } =
                      calculatePaceAndProjection(seller.netSales, seller.targetAmount);

                    const sellerTicketMedio = seller.ticketMedio || 0;
                    const sellerTicketGoal = analysisResult.sellerTicketGoal || 0;
                    const isTicketAchieved = sellerTicketGoal > 0 ? sellerTicketMedio >= sellerTicketGoal : true;

                    return (
                      <tr key={seller.code} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-400">{seller.code}</td>
                        <td className="py-3 px-3 font-sans font-bold text-white">{seller.name}</td>
                        <td className="py-3 px-3 font-bold text-[#00b5ac]">
                          {formatCurrency(seller.netSales)}
                        </td>
                        <td className="py-3 px-3 text-gray-200">
                          {formatCurrency(seller.targetAmount)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              percentAchieved >= 100
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : percentAchieved >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {percentAchieved.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-300">
                          {formatCurrency(sellerTicketMedio)}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {formatCurrency(sellerTicketGoal)}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {isTicketAchieved ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              🟢 No Alvo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              🔴 Abaixo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sky-400 font-bold">
                          {formatCurrency(projectedSales)}
                        </td>
                        <td className="py-3 px-3 text-[#f36e21]">
                          {formatCurrency(remainingGoal)}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {isOnTrack ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ✓ Suficiente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              ⚠ Abaixo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEPARATE ROW FOR "OUTROS" CATEGORY */}
                  {(analysisResult.outros.totalNetSales > 0 || analysisResult.outros.hasGoal) && (
                    <tr className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors border-t-2 border-amber-500/30">
                      <td className="py-3.5 px-3 font-bold text-amber-400">0</td>
                      <td className="py-3.5 px-3 font-sans font-bold text-amber-300">
                        Outros (Balcão / {analysisResult.outros.count} colaboradores sem meta)
                      </td>
                      <td className="py-3.5 px-3 font-bold text-amber-400">
                        {formatCurrency(analysisResult.outros.totalNetSales)}
                      </td>
                      <td className="py-3.5 px-3 text-gray-200 font-semibold">
                        {analysisResult.outros.hasGoal
                          ? formatCurrency(analysisResult.outros.targetAmount)
                          : 'Sem meta'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold">
                        {analysisResult.outros.hasGoal && analysisResult.outros.targetAmount > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded ${
                              (analysisResult.outros.totalNetSales / analysisResult.outros.targetAmount) * 100 >= 100
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : (analysisResult.outros.totalNetSales / analysisResult.outros.targetAmount) * 100 >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {((analysisResult.outros.totalNetSales / analysisResult.outros.targetAmount) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-amber-400">
                        {formatCurrency(analysisResult.outros.ticketMedio)}
                      </td>
                      <td className="py-3.5 px-3 text-gray-400">N/A</td>
                      <td className="py-3.5 px-3 text-center text-gray-400">—</td>
                      <td className="py-3.5 px-3 text-sky-400 font-bold">
                        {formatCurrency((analysisResult.outros.totalNetSales / elapsedDays) * totalBusinessDays)}
                      </td>
                      <td className="py-3.5 px-3 text-[#f36e21]">
                        {analysisResult.outros.hasGoal
                          ? formatCurrency(Math.max(0, analysisResult.outros.targetAmount - analysisResult.outros.totalNetSales))
                          : 'R$ 0,00'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-sans">
                        {analysisResult.outros.hasGoal ? (
                          (analysisResult.outros.totalNetSales / elapsedDays) * totalBusinessDays >= analysisResult.outros.targetAmount ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ✓ Suficiente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              ⚠ Abaixo
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-gray-300">
                            Agrupado
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CONFIRM AND APPLY BUTTON */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={handleConfirmAndApply}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#00b5ac] via-[#008d86] to-[#00b5ac] hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-[#00b5ac]/25 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>Confirmar e Atualizar Aplicativo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
