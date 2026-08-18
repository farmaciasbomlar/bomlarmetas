import React from 'react';
import { GoalConfig, CalculatedStoreMetrics, CalculatedSellerMetrics } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../utils/calculations';

interface MuralPdfTemplateProps {
  goalConfig: GoalConfig;
  storeMetrics: CalculatedStoreMetrics;
  effectiveStoreDailyRequired: number;
  calculatedSellers: CalculatedSellerMetrics[];
}

export const MuralPdfTemplate = React.forwardRef<HTMLDivElement, MuralPdfTemplateProps>(
  ({ goalConfig, storeMetrics, effectiveStoreDailyRequired, calculatedSellers }, ref) => {
    const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);

    return (
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div
          ref={ref}
          style={{
            width: '800px',
            backgroundColor: '#ffffff',
            color: '#111827',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px 28px',
            boxSizing: 'border-box',
          }}
        >
          {/* 1. CABEÇALHO */}
          <div
            style={{
              borderBottom: '3px solid #00b5ac',
              paddingBottom: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '14pt',
                  fontWeight: 800,
                  color: '#00b5ac',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Farmácias Associadas – Bom Lar
              </div>
              <div
                style={{
                  fontSize: '20pt',
                  fontWeight: 900,
                  color: '#111827',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                  lineHeight: 1.1,
                }}
              >
                RESULTADOS DO MÊS – {(goalConfig.monthName || 'ATUAL').toUpperCase()} / FARMÁCIA
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '14pt', fontWeight: 700, color: '#374151' }}>
              Dia {goalConfig.elapsedDays} de {goalConfig.totalBusinessDays}{' '}
              <span style={{ fontSize: '13pt', fontWeight: 700, color: '#f36e21', marginLeft: '4px' }}>
                (Restam {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'})
              </span>
            </div>
          </div>

          {/* 2. BLOCO DE DESTAQUE DA LOJA */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                gap: '16px',
              }}
            >
              {/* Big % Meta & Ritmo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    border: '2px solid #00b5ac',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    minWidth: '140px',
                  }}
                >
                  <div style={{ fontSize: '11pt', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                    DESEMPENHO
                  </div>
                  <div
                    style={{
                      fontSize: '30pt',
                      fontWeight: 900,
                      color: storeMetrics.percentAchieved >= storeMetrics.expectedPacePercent ? '#00b5ac' : '#f36e21',
                      lineHeight: 1,
                      marginTop: '2px',
                    }}
                  >
                    {formatPercent(storeMetrics.percentAchieved, 1)}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    border: '2px solid #f36e21',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    minWidth: '140px',
                  }}
                >
                  <div style={{ fontSize: '11pt', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                    ESPERADO
                  </div>
                  <div style={{ fontSize: '30pt', fontWeight: 900, color: '#f36e21', lineHeight: 1, marginTop: '2px' }}>
                    {formatPercent(storeMetrics.expectedPacePercent, 1)}
                  </div>
                </div>
              </div>

              {/* Key numbers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                <div style={{ fontSize: '14pt', fontWeight: 700, color: '#111827' }}>
                  Faturamento atual:{' '}
                  <span style={{ fontSize: '16pt', fontWeight: 900, color: '#00b5ac' }}>
                    {formatCurrency(storeMetrics.netSales)}
                  </span>{' '}
                  <span style={{ fontSize: '12pt', color: '#6b7280', fontWeight: 600 }}>
                    de {formatCurrency(storeMetrics.totalGoal)}
                  </span>
                </div>
                <div style={{ fontSize: '14pt', fontWeight: 700, color: '#111827' }}>
                  Venda Diária Necessária:{' '}
                  <span style={{ fontSize: '16pt', fontWeight: 900, color: '#f36e21' }}>
                    {formatCurrency(effectiveStoreDailyRequired)}/dia
                  </span>
                </div>
                <div style={{ fontSize: '14pt', fontWeight: 700, color: '#111827' }}>
                  Ticket Médio Loja:{' '}
                  <span style={{ fontSize: '15pt', fontWeight: 800, color: '#111827' }}>
                    {formatCurrency(storeMetrics.ticketMedio)}
                  </span>{' '}
                  <span style={{ fontSize: '12pt', color: '#6b7280', fontWeight: 600 }}>
                    (Meta: {formatCurrency(storeMetrics.ticketGoal)})
                  </span>
                </div>
              </div>
            </div>

            {/* Store Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#e2e8f0',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, storeMetrics.percentAchieved))}%`,
                  backgroundColor:
                    storeMetrics.percentAchieved >= storeMetrics.expectedPacePercent ? '#00b5ac' : '#f36e21',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>

          {/* 3. TABELA / CARDS POR VENDEDOR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {calculatedSellers.map((s) => {
              const hasGoal = s.targetAmount > 0;
              const isOnPace = s.status === 'ON_PACE' || s.percentAchieved >= storeMetrics.expectedPacePercent;

              return (
                <div
                  key={s.collaborator.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '11pt', fontWeight: 700, color: '#6b7280' }}>
                        Cód: {s.collaborator.code}
                      </span>
                      <div style={{ fontSize: '15pt', fontWeight: 900, color: '#111827', lineHeight: 1.1 }}>
                        {s.collaborator.name}
                      </div>
                    </div>
                    <div>
                      {hasGoal ? (
                        isOnPace ? (
                          <span
                            style={{
                              fontSize: '12pt',
                              fontWeight: 800,
                              color: '#00b5ac',
                              backgroundColor: '#e6f8f7',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #00b5ac',
                            }}
                          >
                            ✓ No Ritmo
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '12pt',
                              fontWeight: 800,
                              color: '#f36e21',
                              backgroundColor: '#fff7ed',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #f36e21',
                            }}
                          >
                            ⚠ Abaixo
                          </span>
                        )
                      ) : (
                        <span
                          style={{
                            fontSize: '11pt',
                            fontWeight: 700,
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Outros
                        </span>
                      )}
                    </div>
                  </div>

                  {/* % Meta */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12pt', fontWeight: 700, color: '#4b5563' }}>% Meta:</span>
                    <span
                      style={{
                        fontSize: '28pt',
                        fontWeight: 900,
                        color: hasGoal ? (isOnPace ? '#00b5ac' : '#f36e21') : '#6b7280',
                        lineHeight: 1,
                      }}
                    >
                      {hasGoal ? formatPercent(s.percentAchieved, 1) : 'Sem meta'}
                    </span>
                  </div>

                  {/* Seller Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: hasGoal ? `${Math.min(100, Math.max(0, s.percentAchieved))}%` : '0%',
                        backgroundColor: isOnPace ? '#00b5ac' : '#f36e21',
                        borderRadius: '4px',
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div style={{ fontSize: '13.5pt', lineHeight: 1.45, color: '#1f2937' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#4b5563' }}>Faturamento Atual: </span>
                      <span style={{ fontWeight: 800, color: '#111827' }}>{formatCurrency(s.netSales)}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#4b5563' }}>Meta Diária Restante: </span>
                      <span style={{ fontWeight: 800, color: '#f36e21' }}>
                        {hasGoal ? `${formatCurrency(s.dailyRequiredSales)}/dia` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#4b5563' }}>Ticket Médio: </span>
                      <span style={{ fontWeight: 800, color: '#111827' }}>
                        {formatCurrency(s.ticketMedio)}
                        {hasGoal && s.ticketGoal > 0 && (
                          <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '11.5pt' }}>
                            {' '}
                            (Meta: {formatCurrency(s.ticketGoal)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#4b5563' }}>Clientes Atendidos: </span>
                      <span style={{ fontWeight: 800, color: '#111827' }}>{formatNumber(s.clientsCount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

MuralPdfTemplate.displayName = 'MuralPdfTemplate';
