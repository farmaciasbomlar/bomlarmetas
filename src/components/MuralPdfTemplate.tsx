import React from 'react';
import { GoalConfig, CalculatedStoreMetrics, CalculatedSellerMetrics } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../utils/calculations';

interface MuralPdfTemplateProps {
  goalConfig: GoalConfig;
  storeMetrics: CalculatedStoreMetrics;
  effectiveStoreDailyRequired: number;
  calculatedSellers: CalculatedSellerMetrics[];
  managerMessage?: string;
}

/**
 * Splits a long text cleanly into paragraph/line chunks so that no text line or paragraph
 * is cut in half across PDF page boundaries.
 */
function splitMessageIntoPages(message: string, linesPerPage = 34): string[] {
  if (!message || !message.trim()) return [];
  const paragraphs = message.trim().split('\n');
  const pages: string[] = [];
  let currentChunk: string[] = [];
  let currentLineCount = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    const linesNeeded = trimmed.length === 0 ? 1 : Math.max(1, Math.ceil(trimmed.length / 70));

    // If adding this paragraph exceeds page limit and chunk already has content, push current chunk
    if (currentLineCount + linesNeeded > linesPerPage && currentChunk.length > 0) {
      pages.push(currentChunk.join('\n'));
      currentChunk = [];
      currentLineCount = 0;
    }

    // If a single paragraph is longer than linesPerPage, break by sentences/words
    if (linesNeeded > linesPerPage) {
      const words = para.split(' ');
      let lineBuffer = '';
      for (const word of words) {
        const testLine = lineBuffer ? `${lineBuffer} ${word}` : word;
        if (testLine.length > 70) {
          currentChunk.push(lineBuffer);
          currentLineCount++;
          if (currentLineCount >= linesPerPage) {
            pages.push(currentChunk.join('\n'));
            currentChunk = [];
            currentLineCount = 0;
          }
          lineBuffer = word;
        } else {
          lineBuffer = testLine;
        }
      }
      if (lineBuffer) {
        currentChunk.push(lineBuffer);
        currentLineCount++;
      }
    } else {
      currentChunk.push(para);
      currentLineCount += linesNeeded;
    }
  }

  if (currentChunk.length > 0) {
    pages.push(currentChunk.join('\n'));
  }

  return pages;
}

export const MuralPdfTemplate = React.forwardRef<HTMLDivElement, MuralPdfTemplateProps>(
  ({ goalConfig, storeMetrics, effectiveStoreDailyRequired, calculatedSellers, managerMessage }, ref) => {
    const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);
    const cleanMessage = managerMessage ? managerMessage.trim() : '';

    // Calculate vertical space used on Page 1
    // Standard A4 container is 800px width x 1131px height.
    // Inner height available = 1131px - 48px padding = 1083px.
    const sellerRows = Math.ceil(calculatedSellers.length / 2);
    const sellerGridHeight = sellerRows * 196 + (sellerRows > 1 ? (sellerRows - 1) * 12 : 0);
    // Header (~86px) + Store highlight (~174px) + Margins + safe margin = ~330px
    const page1OccupiedHeight = 330 + sellerGridHeight;
    const availablePage1Height = Math.max(0, 1083 - page1OccupiedHeight - 20);

    // Calculate lines in manager message
    let totalEstimatedLines = 0;
    if (cleanMessage) {
      const paras = cleanMessage.split('\n');
      paras.forEach((p) => {
        const len = p.trim().length;
        totalEstimatedLines += len === 0 ? 0.7 : Math.max(1, Math.ceil(len / 70));
      });
    }
    const estimatedMessageHeight = cleanMessage ? 84 + totalEstimatedLines * 25 : 0;

    // Decision: does message fit on Page 1?
    const fitsOnPage1 = cleanMessage.length > 0 && estimatedMessageHeight <= availablePage1Height;

    // Build pages configuration
    type PageConfig =
      | { type: 'store-with-message'; message: string }
      | { type: 'store-only'; totalPages: number }
      | { type: 'message-page'; message: string; isContinuation: boolean; pageNum: number; totalPages: number };

    let pages: PageConfig[] = [];

    if (!cleanMessage) {
      pages = [{ type: 'store-only', totalPages: 1 }];
    } else if (fitsOnPage1) {
      pages = [{ type: 'store-with-message', message: cleanMessage }];
    } else {
      // Message does not fit completely on Page 1 -> Move entire message to Page 2+
      const messageChunks = splitMessageIntoPages(cleanMessage, 34);
      const totalPages = 1 + messageChunks.length;
      pages = [
        { type: 'store-only', totalPages },
        ...messageChunks.map((chunk, idx) => ({
          type: 'message-page' as const,
          message: chunk,
          isContinuation: idx > 0,
          pageNum: idx + 2,
          totalPages,
        })),
      ];
    }

    return (
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div ref={ref}>
          {pages.map((page, pageIdx) => {
            if (page.type === 'store-only' || page.type === 'store-with-message') {
              return (
                <div
                  key={`page-${pageIdx}`}
                  className="pdf-page"
                  style={{
                    width: '800px',
                    minHeight: '1131px',
                    height: '1131px',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    padding: '24px 28px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    overflow: 'hidden',
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
                    <div style={{ textAlign: 'right', fontSize: '13pt', fontWeight: 700, color: '#374151' }}>
                      <div>
                        Dia {goalConfig.elapsedDays} de {goalConfig.totalBusinessDays}{' '}
                        <span style={{ fontSize: '12.5pt', fontWeight: 700, color: '#f36e21', marginLeft: '4px' }}>
                          (Restam {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'})
                        </span>
                      </div>
                      {page.type === 'store-only' && page.totalPages > 1 && (
                        <div style={{ fontSize: '11pt', color: '#6b7280', marginTop: '3px' }}>
                          Página 1 de {page.totalPages}
                        </div>
                      )}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: page.type === 'store-with-message' ? '16px' : '0px' }}>
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
                            justifyContent: 'space-between',
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

                  {/* 4. MENSAGEM DO GERENTE (QUANDO COUBE INTEIRA NA PÁGINA 1) */}
                  {page.type === 'store-with-message' && (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #00b5ac',
                        borderLeft: '8px solid #f36e21',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '15pt', lineHeight: 1 }}>📢</span>
                        <div
                          style={{
                            fontSize: '11.5pt',
                            fontWeight: 900,
                            color: '#00b5ac',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                          }}
                        >
                          MENSAGEM DO GERENTE PARA A EQUIPE
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '13pt',
                          fontWeight: 600,
                          color: '#111827',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          paddingLeft: '2px',
                        }}
                      >
                        {page.message}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Dedicated Page for Manager Message (Page 2, 3...)
            return (
              <div
                key={`page-${pageIdx}`}
                className="pdf-page"
                style={{
                  width: '800px',
                  minHeight: '1131px',
                  height: '1131px',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  padding: '24px 28px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header for continuation page */}
                <div
                  style={{
                    borderBottom: '3px solid #00b5ac',
                    paddingBottom: '12px',
                    marginBottom: '20px',
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
                        fontSize: '18pt',
                        fontWeight: 900,
                        color: '#111827',
                        textTransform: 'uppercase',
                        marginTop: '2px',
                        lineHeight: 1.1,
                      }}
                    >
                      MURAL DE RESULTADOS – {(goalConfig.monthName || 'ATUAL').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12pt', fontWeight: 700, color: '#6b7280' }}>
                    Página {page.pageNum} de {page.totalPages}
                  </div>
                </div>

                {/* Full Message Box on Page 2+ */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #00b5ac',
                    borderLeft: '8px solid #f36e21',
                    borderRadius: '12px',
                    padding: '18px 22px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    boxSizing: 'border-box',
                    flexGrow: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <span style={{ fontSize: '16pt', lineHeight: 1 }}>📢</span>
                    <div
                      style={{
                        fontSize: '12pt',
                        fontWeight: 900,
                        color: '#00b5ac',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {page.isContinuation
                        ? 'MENSAGEM DO GERENTE PARA A EQUIPE (continuação)'
                        : 'MENSAGEM DO GERENTE PARA A EQUIPE'}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '13.5pt',
                      fontWeight: 600,
                      color: '#111827',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      paddingLeft: '2px',
                    }}
                  >
                    {page.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

MuralPdfTemplate.displayName = 'MuralPdfTemplate';
