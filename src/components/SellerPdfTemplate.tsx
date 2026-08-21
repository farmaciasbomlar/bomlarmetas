import React from 'react';
import { Collaborator, GoalConfig, CalculatedSellerMetrics } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../utils/calculations';
import { Flame, Target, CheckCircle2, AlertTriangle, XCircle, Users, FileText } from 'lucide-react';

interface SellerPdfTemplateProps {
  currentSeller: Collaborator;
  goalConfig: GoalConfig;
  metrics: CalculatedSellerMetrics;
  effectiveDailyRequiredSales: number;
  effectiveTicketGoal: number;
  hasGoal: boolean;
  currentNote?: string;
}

export const SellerPdfTemplate = React.forwardRef<HTMLDivElement, SellerPdfTemplateProps>(
  (
    {
      currentSeller,
      goalConfig,
      metrics,
      effectiveDailyRequiredSales,
      effectiveTicketGoal,
      hasGoal,
      currentNote = '',
    },
    ref
  ) => {
    const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);

    // Status styling optimized for high-contrast white background / B&W printing
    const getPrintStatusInfo = (status: 'ON_PACE' | 'WARNING' | 'BEHIND', hasGoal: boolean) => {
      if (!hasGoal) {
        return {
          label: 'SEM META CADASTRADA',
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-700',
          color: '#6b7280',
          icon: Users,
        };
      }
      switch (status) {
        case 'ON_PACE':
          return {
            label: 'NO RITMO / EXCELENTE',
            bg: 'bg-teal-50',
            border: 'border-[#00b5ac]',
            text: 'text-[#007a74]',
            color: '#00b5ac',
            icon: CheckCircle2,
          };
        case 'WARNING':
          return {
            label: 'ATENÇÃO / LEVE ATRASO',
            bg: 'bg-amber-50',
            border: 'border-amber-400',
            text: 'text-amber-800',
            color: '#d97706',
            icon: AlertTriangle,
          };
        case 'BEHIND':
          return {
            label: 'FORA DO RITMO (ACELERAR)',
            bg: 'bg-rose-50',
            border: 'border-rose-400',
            text: 'text-rose-800',
            color: '#e11d48',
            icon: XCircle,
          };
      }
    };

    const statusInfo = getPrintStatusInfo(metrics.status, hasGoal);
    const StatusIcon = statusInfo.icon;

    // Progress Donut calculations
    const strokeDasharray = 283;
    const normalizedPercent = hasGoal ? Math.min(100, Math.max(0, metrics.percentAchieved)) : 0;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * normalizedPercent) / 100;

    const cleanNote = currentNote ? currentNote.trim() : '';

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          zIndex: -9999,
          pointerEvents: 'none',
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
        }}
        className="font-sans antialiased"
      >
        <div
          className="pdf-page"
          style={{
            width: '800px',
            minHeight: '1131px',
            maxHeight: '1131px',
            backgroundColor: '#ffffff',
            padding: '36px 40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* TOP SECTION */}
          <div className="space-y-5">
            {/* 1. Header with Logo, Title, and Status Badge */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
              <div className="flex items-center space-x-4">
                <img
                  src="https://i.ibb.co/LdKcYjTq/01-LOGO-BOM-LAR-2024-sem-Tarja-PRINCIPAL.png"
                  alt="Farmácias Associadas Bom Lar"
                  className="h-12 w-auto object-contain max-w-[170px]"
                  crossOrigin="anonymous"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black tracking-wider text-[#00b5ac] uppercase">
                      BOM LAR RESULTADOS — MÊS DE {(goalConfig.monthName || 'MÊS ATUAL').toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff4ed] text-[#f36e21] border border-[#f36e21]/40">
                      Dia {goalConfig.elapsedDays} de {goalConfig.totalBusinessDays} úteis
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-[#1a1a1a] tracking-tight mt-0.5">
                    {currentSeller.name}{' '}
                    <span className="text-xs font-mono text-gray-500 font-semibold">
                      (Cód: {currentSeller.code || '0'})
                    </span>
                  </h1>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`px-3.5 py-1.5 rounded-xl border ${statusInfo.border} ${statusInfo.bg} ${statusInfo.text} flex items-center space-x-2 text-xs font-black`}
              >
                <StatusIcon className="w-4 h-4 shrink-0" />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            {/* 2. Main Performance Section: Donut + Daily Target & Ticket Cards */}
            <div className="grid grid-cols-12 gap-5 items-center">
              {/* Donut Chart (White Card with Subtle Gray Border) */}
              <div className="col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Ring */}
                    <circle cx="50" cy="50" r="42" stroke="#e0e0e0" strokeWidth="10" fill="transparent" />
                    {/* Progress Ring in Turquoise / Brand color */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#00b5ac"
                      strokeWidth="10"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-3xl font-black text-[#1a1a1a] font-mono tracking-tight">
                      {hasGoal ? formatPercent(metrics.percentAchieved, 1) : 'Sem meta'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                      da Meta Batida
                    </span>
                    <span className="text-xs text-[#00b5ac] font-mono mt-1 font-bold">
                      Alvo: {hasGoal ? formatCurrency(metrics.targetAmount) : 'Sem meta'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center text-xs text-gray-600">
                  Faturado até hoje:{' '}
                  <strong className="text-[#1a1a1a] font-mono font-bold">
                    {formatCurrency(metrics.netSales)}
                  </strong>
                </div>
              </div>

              {/* Targets Column: Daily Goal Card + Ticket Médio Card */}
              <div className="col-span-7 space-y-3.5">
                {/* Daily Goal Required Card (White with Orange Border) */}
                <div className="bg-white border-2 border-[#f36e21] rounded-2xl p-4 shadow-sm relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#f36e21] uppercase tracking-wider">
                      Meta Diária Necessária
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#f36e21] flex items-center justify-center text-white shadow-sm">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-2xl font-black text-[#1a1a1a] font-mono">
                    {hasGoal ? formatCurrency(effectiveDailyRequiredSales) : 'Sem meta'}
                  </p>

                  <span className="text-[11px] font-medium text-gray-600 block mt-0.5">
                    / dia nos {daysRemaining} dias restantes do mês
                  </span>
                </div>

                {/* Ticket Médio Card (White with Turquoise Border) */}
                <div className="bg-white border-2 border-[#00b5ac] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider">
                      Ticket Médio Atual
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-teal-50 border border-[#00b5ac]/40 flex items-center justify-center text-[#00b5ac]">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-black text-[#1a1a1a] font-mono">
                      {formatCurrency(metrics.ticketMedio)}
                    </p>
                    <span className="text-xs font-mono text-gray-600">
                      Meta:{' '}
                      <strong className="text-[#1a1a1a] font-bold">
                        {formatCurrency(effectiveTicketGoal)}
                      </strong>
                    </span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-2.5 bg-[#e0e0e0] rounded-full overflow-hidden mt-2.5">
                    <div
                      className="h-full bg-[#00b5ac] rounded-full"
                      style={{
                        width: `${Math.min(100, (metrics.ticketMedio / (effectiveTicketGoal || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 4-Metrics Row (White / Very light gray boxes with dark readable text) */}
            <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="border-r border-gray-200 pr-2">
                <span className="text-[10px] font-semibold text-gray-600 uppercase block tracking-tight">
                  Clientes Atendidos
                </span>
                <span className="text-lg font-black text-[#1a1a1a] font-mono mt-0.5 block">
                  {formatNumber(metrics.clientsCount)}
                </span>
              </div>
              <div className="border-r border-gray-200 pr-2">
                <span className="text-[10px] font-semibold text-gray-600 uppercase block tracking-tight">
                  Itens Vendidos
                </span>
                <span className="text-lg font-black text-[#1a1a1a] font-mono mt-0.5 block">
                  {formatNumber(metrics.itemsCount)}
                </span>
              </div>
              <div className="border-r border-gray-200 pr-2">
                <span className="text-[10px] font-semibold text-gray-600 uppercase block tracking-tight">
                  Média Itens/Cliente
                </span>
                <span className="text-lg font-black text-[#007a74] font-mono mt-0.5 block">
                  {metrics.itemsPerClient.toFixed(1)} itens
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-600 uppercase block tracking-tight">
                  % Desconto
                </span>
                <span className="text-lg font-black text-amber-700 font-mono mt-0.5 block">
                  {formatPercent(metrics.discountPercent, 1)}
                </span>
              </div>
            </div>

            {/* 4. Action Plan / Manager Notes (Only if populated, with clean print border) */}
            {cleanNote.length > 0 && (
              <div className="bg-white border-2 border-[#00b5ac] border-l-4 border-l-[#f36e21] rounded-xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#00b5ac]" />
                    <h3 className="text-xs font-black text-[#007a74] uppercase tracking-wider">
                      PLANO DE AÇÃO — COMBINADO COM O VENDEDOR
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold bg-amber-50 text-[#f36e21] px-2 py-0.5 rounded border border-[#f36e21]/30">
                    Anotações da Gerência
                  </span>
                </div>
                <div
                  className="text-xs text-[#1a1a1a] leading-relaxed font-sans bg-gray-50 p-3 rounded-lg border border-gray-200"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {cleanNote}
                </div>
              </div>
            )}
          </div>

          {/* 5. Footer */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-3 border-t border-gray-200 mt-4">
            <span className="font-semibold text-gray-600">
              Farmácias Associadas Bom Lar • PharmaMetas
            </span>
            <span>
              Impresso / Exportado em {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
