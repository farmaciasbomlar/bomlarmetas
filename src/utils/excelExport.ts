import * as XLSX from 'xlsx';
import { GoalConfig, CalculatedStoreMetrics, CalculatedSellerMetrics } from '../types';

export interface ExportStoreExcelParams {
  goalConfig: GoalConfig;
  storeMetrics: CalculatedStoreMetrics;
  effectiveStoreDailyRequired: number;
  calculatedSellers: CalculatedSellerMetrics[];
  managerMessage?: string; // Kept in interface for backward compatibility, excluded from export
}

/**
 * Excel cell format string for Brazilian Real currency (BRL).
 * Standard format: "R$ #,##0.00" (rendered as R$ 159.844,66 in pt-BR Excel, while preserving true number).
 */
const BRL_CURRENCY_FORMAT = '"R$" #,##0.00';

/**
 * Exports the complete Store Performance report to an Excel spreadsheet (.xlsx),
 * with all monetary values formatted as true Excel currency numbers (allowing sum and formulas),
 * without the manager message.
 */
export function exportStorePerformanceToExcel({
  goalConfig,
  storeMetrics,
  effectiveStoreDailyRequired,
  calculatedSellers,
}: ExportStoreExcelParams): void {
  const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);

  const rows: (string | number | undefined)[][] = [];

  // 1. Cabeçalho Principal
  rows.push(['FARMÁCIAS ASSOCIADAS – BOM LAR']); // Row 0
  rows.push([`RELATÓRIO DE DESEMPENHO E METAS – ${(goalConfig.monthName || 'MÊS ATUAL').toUpperCase()}`]); // Row 1
  rows.push([
    `Dia ${goalConfig.elapsedDays} de ${goalConfig.totalBusinessDays} dias úteis (Restam ${daysRemaining} ${
      daysRemaining === 1 ? 'dia' : 'dias'
    })`,
  ]); // Row 2
  rows.push([]); // Row 3

  // 2. Resumo Geral da Loja
  rows.push(['RESUMO DA LOJA']); // Row 4
  rows.push(['Meta Total da Loja (R$):', storeMetrics.totalGoal]); // Row 5 (r: 5, c: 1)
  rows.push(['Faturamento Atual - Venda Líquida (R$):', storeMetrics.netSales]); // Row 6 (r: 6, c: 1)
  rows.push(['% Atingido da Meta:', `${storeMetrics.percentAchieved.toFixed(1).replace('.', ',')}%`]); // Row 7
  rows.push(['Desempenho Esperado / Ritmo:', `${storeMetrics.expectedPacePercent.toFixed(1).replace('.', ',')}%`]); // Row 8
  rows.push(['Venda Diária Necessária (R$/dia):', effectiveStoreDailyRequired]); // Row 9 (r: 9, c: 1)
  rows.push(['Ticket Médio da Loja (R$):', storeMetrics.ticketMedio]); // Row 10 (r: 10, c: 1)
  rows.push(['Meta de Ticket da Loja (R$):', storeMetrics.ticketGoal]); // Row 11 (r: 11, c: 1)
  rows.push(['Vendas dos Vendedores (R$):', storeMetrics.sellersNetSales]); // Row 12 (r: 12, c: 1)
  rows.push(['Vendas Outros / Balcão (R$):', storeMetrics.nonSellersNetSales]); // Row 13 (r: 13, c: 1)
  rows.push([]); // Row 14

  // 3. Tabela de Desempenho por Colaborador
  rows.push(['DESEMPENHO POR COLABORADOR']); // Row 15
  rows.push([
    'Código',
    'Nome',
    'Função',
    'Meta Individual (R$)',
    'Venda Líquida (R$)',
    '% Meta Batida',
    'Meta Diária Restante (R$/dia)',
    'Ticket Médio (R$)',
    'Meta Ticket (R$)',
    'Clientes Atendidos',
    'Status / Ritmo',
  ]); // Row 16 (Header)

  const collaboratorStartRow = rows.length; // Row 17

  calculatedSellers.forEach((s) => {
    const hasGoal = s.targetAmount > 0;
    const isOnPace = s.status === 'ON_PACE' || s.percentAchieved >= storeMetrics.expectedPacePercent;
    let statusStr = 'Outros / Balcão';
    if (hasGoal) {
      statusStr = isOnPace ? 'No Ritmo' : 'Abaixo do Ritmo';
    }

    const codeVal = s.collaborator.code
      ? isNaN(Number(s.collaborator.code))
        ? s.collaborator.code
        : Number(s.collaborator.code)
      : '-';

    rows.push([
      codeVal,
      s.collaborator.name,
      s.collaborator.role || (s.collaborator.isSeller ? 'Vendedor' : 'Outros'),
      hasGoal ? s.targetAmount : 0,
      s.netSales,
      hasGoal ? `${s.percentAchieved.toFixed(1).replace('.', ',')}%` : 'Sem meta',
      hasGoal ? s.dailyRequiredSales : 0,
      s.ticketMedio,
      hasGoal && s.ticketGoal > 0 ? s.ticketGoal : 0,
      s.clientsCount,
      statusStr,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Helper to format a cell as true numeric Excel currency
  const formatAsCurrency = (r: number, c: number) => {
    const cellRef = XLSX.utils.encode_cell({ r, c });
    if (ws[cellRef]) {
      const val = typeof ws[cellRef].v === 'number' ? ws[cellRef].v : Number(ws[cellRef].v);
      if (!isNaN(val)) {
        ws[cellRef].t = 'n';
        ws[cellRef].v = val;
        ws[cellRef].z = BRL_CURRENCY_FORMAT;
      }
    }
  };

  // Format Resumo da Loja currency cells (Column B, index 1)
  const storeCurrencyRows = [5, 6, 9, 10, 11, 12, 13];
  storeCurrencyRows.forEach((r) => formatAsCurrency(r, 1));

  // Format Tabela de Colaboradores currency cells (Columns D, E, G, H, I -> indices 3, 4, 6, 7, 8)
  for (let i = 0; i < calculatedSellers.length; i++) {
    const r = collaboratorStartRow + i;
    formatAsCurrency(r, 3); // Meta Individual (R$)
    formatAsCurrency(r, 4); // Venda Líquida (R$)
    formatAsCurrency(r, 6); // Meta Diária Restante (R$/dia)
    formatAsCurrency(r, 7); // Ticket Médio (R$)
    formatAsCurrency(r, 8); // Meta Ticket (R$)
  }

  // Set column widths for comfortable reading in Excel
  ws['!cols'] = [
    { wch: 14 }, // Código / Rótulos
    { wch: 38 }, // Nome / Rótulo / Valores
    { wch: 18 }, // Função
    { wch: 22 }, // Meta Individual (R$)
    { wch: 22 }, // Venda Líquida (R$)
    { wch: 16 }, // % Meta Batida
    { wch: 28 }, // Meta Diária Restante (R$/dia)
    { wch: 18 }, // Ticket Médio (R$)
    { wch: 18 }, // Meta Ticket (R$)
    { wch: 20 }, // Clientes Atendidos
    { wch: 20 }, // Status / Ritmo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Desempenho da Loja');

  const cleanMonth = (goalConfig.monthName || 'Mes').replace(/\s+/g, '_');
  const filename = `Desempenho_Loja_${cleanMonth}_Dia${goalConfig.elapsedDays}.xlsx`;

  XLSX.writeFile(wb, filename);
}
