import { Collaborator, GoalConfig, IndividualResult, StoreResult } from '../types';

export const INITIAL_GOAL_CONFIG: GoalConfig = {
  monthName: 'Julho',
  totalGoal: 195953.0,
  totalBusinessDays: 26,
  elapsedDays: 1,
  storeTicketGoal: 47.0,
  defaultSellerTicketGoal: 54.0,
};

export const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    id: 'seller-727',
    code: '727',
    name: 'ANDRESSA',
    isSeller: true,
    role: 'Vendedor',
    weightPercent: 33.0,
    ticketGoal: 54.0,
  },
  {
    id: 'seller-688',
    code: '688',
    name: 'LUCAS',
    isSeller: true,
    role: 'Vendedor',
    weightPercent: 35.0,
    ticketGoal: 54.0,
  },
  {
    id: 'seller-736',
    code: '736',
    name: 'DANIELI',
    isSeller: true,
    role: 'Vendedor',
    weightPercent: 12.0,
    ticketGoal: 54.0,
  },
  {
    id: 'nonseller-01',
    code: '0714',
    name: 'LETIANE (FARMACÊUTICA)',
    isSeller: false,
    role: 'Farmacêutico',
    weightPercent: 0,
    ticketGoal: 0,
  },
  {
    id: 'nonseller-02',
    code: 'OUTROS',
    name: 'GERÊNCIA / CAIXA / OUTROS',
    isSeller: false,
    role: 'Outros',
    weightPercent: 20.0, // Reference allocation in store spreadsheet
    ticketGoal: 0,
  },
];

// Sample initial results from Image 1 & Image 2 (Day 1 snapshot)
export const INITIAL_INDIVIDUAL_RESULTS: Record<string, IndividualResult> = {
  'seller-727': {
    collaboratorId: 'seller-727',
    netSales: 1576.34,
    ticketMedio: 49.26,
    clientsCount: 32,
    itemsCount: 77,
    unitsCount: 98,
    grossSales: 2054.52,
    discountPercent: 23.01,
    discountAmount: 478.18,
  },
  'seller-688': {
    collaboratorId: 'seller-688',
    netSales: 2497.75,
    ticketMedio: 48.98,
    clientsCount: 51,
    itemsCount: 104,
    unitsCount: 123,
    grossSales: 3684.73,
    discountPercent: 24.26,
    discountAmount: 897.3,
  },
  'seller-736': {
    collaboratorId: 'seller-736',
    netSales: 1030.05,
    ticketMedio: 38.15,
    clientsCount: 27,
    itemsCount: 48,
    unitsCount: 51,
    grossSales: 1335.95,
    discountPercent: 22.62,
    discountAmount: 305.9,
  },
  'nonseller-01': {
    collaboratorId: 'nonseller-01',
    netSales: 997.92,
    ticketMedio: 45.36,
    clientsCount: 22,
    itemsCount: 43,
    unitsCount: 55,
    grossSales: 1286.61,
    discountPercent: 22.26,
    discountAmount: 288.69,
  },
};

export const INITIAL_STORE_RESULT: StoreResult = {
  netSales: 6102.06,
  ticketMedio: 46.23,
  clientsCount: 132,
  itemsCount: 272,
  unitsCount: 327,
  discountPercent: 23.38,
};
