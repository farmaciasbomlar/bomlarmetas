export type TeamRole = 'Vendedor' | 'Gerente' | 'Farmacêutico' | 'Caixa' | 'Outros';

export interface Collaborator {
  id: string;
  code: string;
  name: string;
  isSeller: boolean;
  role: TeamRole;
  weightPercent: number; // e.g. 33 for 33% (only relevant if isSeller)
  ticketGoal: number; // e.g. 54.00
}

export interface GoalConfig {
  monthName: string; // e.g. "Julho"
  totalGoal: number; // R$ meta geral
  totalBusinessDays: number; // e.g. 26
  elapsedDays: number; // e.g. 10
  storeTicketGoal: number; // R$ meta ticket loja e.g. 47.00
  defaultSellerTicketGoal: number; // R$ meta ticket vendedor e.g. 54.00
}

export interface IndividualResult {
  collaboratorId: string;
  netSales: number; // Venda Líquida
  ticketMedio: number; // Ticket Médio
  clientsCount: number; // Clientes atendidos
  itemsCount: number; // Total de itens
  unitsCount: number; // Total de unidades
  grossSales?: number; // Venda bruta
  discountPercent?: number; // % Desconto
  discountAmount?: number; // Desconto em R$
}

export interface StoreResult {
  netSales: number; // Venda Líquida total da loja
  ticketMedio: number;
  clientsCount: number;
  itemsCount: number;
  unitsCount: number;
  discountPercent?: number;
}

export type PerformanceStatus = 'ON_PACE' | 'WARNING' | 'BEHIND';

export interface CalculatedSellerMetrics {
  collaborator: Collaborator;
  targetAmount: number; // Target in R$ = totalGoal * (weightPercent / 100)
  netSales: number; // Actual current sales
  percentAchieved: number; // (netSales / targetAmount) * 100
  ticketMedio: number;
  ticketGoal: number;
  ticketStatus: PerformanceStatus;
  clientsCount: number;
  itemsCount: number;
  unitsCount: number;
  itemsPerClient: number; // items / clients
  unitsPerClient: number; // units / clients
  discountPercent: number;
  remainingGoal: number; // max(0, targetAmount - netSales)
  daysRemaining: number;
  dailyRequiredSales: number; // remainingGoal / daysRemaining
  paceRatio: number; // percentAchieved / expectedPacePercent
  status: PerformanceStatus;
}

export interface CalculatedStoreMetrics {
  totalGoal: number;
  netSales: number;
  percentAchieved: number;
  sellersNetSales: number;
  nonSellersNetSales: number; // "Outros"
  nonSellersSharePercent: number;
  ticketMedio: number;
  ticketGoal: number;
  clientsCount: number;
  itemsCount: number;
  unitsCount: number;
  discountPercent: number;
  remainingGoal: number;
  dailyRequiredSales: number;
  expectedPacePercent: number;
  daysRemaining: number;
  status: PerformanceStatus;
}

export interface OCRParsedRow {
  code: string;
  name: string;
  grossSales: number;
  discountAmount: number;
  discountPercent: number;
  netSales: number;
  items: number;
  units: number;
  clients: number;
  ticketMedio: number;
  matchedCollaboratorId?: string;
}

export interface OCRParseResult {
  storeTotal: {
    grossSales: number;
    discountAmount: number;
    discountPercent: number;
    netSales: number;
    items: number;
    units: number;
    clients: number;
    ticketMedio: number;
  };
  rows: OCRParsedRow[];
  rawTextSummary?: string;
}

export interface AIAnalysisSeller {
  collaboratorId: string;
  collaboratorName: string;
  diagnosisDiagnosis: string; // Faturamento, Ticket, Margem
  primaryIssue: 'FLUXO' | 'VENDA_ADICIONAL' | 'MARGEM' | 'EXCELENTE';
  issueLabel: string;
  recommendedAction: string;
  talkingPointScript: string;
}

export interface AIAnalysisStore {
  summary: string;
  strengthPoints: string[];
  attentionPoints: string[];
  managerActionPlan: string[];
  nonSellersImpactComment: string;
}

export interface AIAnalysisResponse {
  store: AIAnalysisStore;
  sellers: AIAnalysisSeller[];
}
