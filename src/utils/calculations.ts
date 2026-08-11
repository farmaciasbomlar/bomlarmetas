import {
  Collaborator,
  GoalConfig,
  IndividualResult,
  StoreResult,
  CalculatedSellerMetrics,
  CalculatedStoreMetrics,
  PerformanceStatus,
} from '../types';

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00%';
  }
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatNumber(value: number | undefined | null, decimals = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getManualDailyOverride(
  map: Record<string, number | null> | undefined,
  collaborator: Collaborator
): number | null {
  if (!map || !collaborator) return null;
  if (collaborator.id && map[collaborator.id] !== undefined && map[collaborator.id] !== null) {
    return map[collaborator.id];
  }
  if (collaborator.code && map[collaborator.code] !== undefined && map[collaborator.code] !== null) {
    return map[collaborator.code];
  }
  return null;
}

export function getManualTicketOverride(
  map: Record<string, number | null> | undefined,
  collaborator: Collaborator
): number | null {
  if (!map || !collaborator) return null;
  if (collaborator.id && map[collaborator.id] !== undefined && map[collaborator.id] !== null) {
    return map[collaborator.id];
  }
  if (collaborator.code && map[collaborator.code] !== undefined && map[collaborator.code] !== null) {
    return map[collaborator.code];
  }
  return null;
}

export function calculateSellerMetrics(
  collaborator: Collaborator,
  goalConfig: GoalConfig,
  result: IndividualResult | undefined,
  overrideDailyRequiredSales?: number | null,
  overrideTicketGoal?: number | null
): CalculatedSellerMetrics {
  const weight = collaborator.weightPercent || 0;
  const targetAmount = goalConfig.totalGoal * (weight / 100);
  const netSales = result?.netSales || 0;
  const ticketMedio = result?.ticketMedio || 0;
  const clientsCount = result?.clientsCount || 0;
  const itemsCount = result?.itemsCount || 0;
  const unitsCount = result?.unitsCount || 0;
  const discountPercent = result?.discountPercent || 0;

  const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);
  const remainingGoal = Math.max(0, targetAmount - netSales);
  let dailyRequiredSales = daysRemaining > 0 ? remainingGoal / daysRemaining : 0;

  if (overrideDailyRequiredSales !== undefined && overrideDailyRequiredSales !== null) {
    dailyRequiredSales = overrideDailyRequiredSales;
  }

  const percentAchieved = targetAmount > 0 ? (netSales / targetAmount) * 100 : 0;

  const expectedPacePercent =
    goalConfig.totalBusinessDays > 0
      ? (goalConfig.elapsedDays / goalConfig.totalBusinessDays) * 100
      : 0;

  const paceRatio = expectedPacePercent > 0 ? percentAchieved / expectedPacePercent : 1;

  let status: PerformanceStatus = 'ON_PACE';
  if (expectedPacePercent > 0) {
    if (paceRatio >= 0.98 || percentAchieved >= expectedPacePercent) {
      status = 'ON_PACE';
    } else if (paceRatio >= 0.82) {
      status = 'WARNING';
    } else {
      status = 'BEHIND';
    }
  }

  const ticketGoal =
    overrideTicketGoal !== undefined && overrideTicketGoal !== null && overrideTicketGoal > 0
      ? overrideTicketGoal
      : collaborator.ticketGoal || goalConfig.defaultSellerTicketGoal || 54;

  let ticketStatus: PerformanceStatus = 'ON_PACE';
  if (ticketMedio < ticketGoal * 0.88) {
    ticketStatus = 'BEHIND';
  } else if (ticketMedio < ticketGoal * 0.96) {
    ticketStatus = 'WARNING';
  }

  const itemsPerClient = clientsCount > 0 ? itemsCount / clientsCount : 0;
  const unitsPerClient = clientsCount > 0 ? unitsCount / clientsCount : 0;

  return {
    collaborator,
    targetAmount,
    netSales,
    percentAchieved,
    ticketMedio,
    ticketGoal,
    ticketStatus,
    clientsCount,
    itemsCount,
    unitsCount,
    itemsPerClient,
    unitsPerClient,
    discountPercent,
    remainingGoal,
    daysRemaining,
    dailyRequiredSales,
    paceRatio,
    status,
  };
}

export function calculateStoreMetrics(
  goalConfig: GoalConfig,
  storeResult: StoreResult,
  collaborators: Collaborator[],
  individualResults: Record<string, IndividualResult>
): CalculatedStoreMetrics {
  const sellers = collaborators.filter((c) => c.isSeller);
  const nonSellers = collaborators.filter((c) => !c.isSeller);

  let sellersNetSales = 0;
  sellers.forEach((s) => {
    sellersNetSales += individualResults[s.id]?.netSales || 0;
  });

  let explicitNonSellersNetSales = 0;
  nonSellers.forEach((ns) => {
    explicitNonSellersNetSales += individualResults[ns.id]?.netSales || 0;
  });

  // Store total net sales as reported or sum
  const netSales =
    storeResult.netSales > 0
      ? storeResult.netSales
      : sellersNetSales + explicitNonSellersNetSales;

  // Non sellers net sales is difference between total store sales and registered seller sales
  const nonSellersNetSales = Math.max(0, netSales - sellersNetSales);

  const nonSellersSharePercent = netSales > 0 ? (nonSellersNetSales / netSales) * 100 : 0;

  const percentAchieved =
    goalConfig.totalGoal > 0 ? (netSales / goalConfig.totalGoal) * 100 : 0;

  const expectedPacePercent =
    goalConfig.totalBusinessDays > 0
      ? (goalConfig.elapsedDays / goalConfig.totalBusinessDays) * 100
      : 0;

  const daysRemaining = Math.max(0, goalConfig.totalBusinessDays - goalConfig.elapsedDays);
  const remainingGoal = Math.max(0, goalConfig.totalGoal - netSales);
  const dailyRequiredSales = daysRemaining > 0 ? remainingGoal / daysRemaining : 0;

  const paceRatio = expectedPacePercent > 0 ? percentAchieved / expectedPacePercent : 1;

  let status: PerformanceStatus = 'ON_PACE';
  if (expectedPacePercent > 0) {
    if (paceRatio >= 0.98 || percentAchieved >= expectedPacePercent) {
      status = 'ON_PACE';
    } else if (paceRatio >= 0.82) {
      status = 'WARNING';
    } else {
      status = 'BEHIND';
    }
  }

  return {
    totalGoal: goalConfig.totalGoal,
    netSales,
    percentAchieved,
    sellersNetSales,
    nonSellersNetSales,
    nonSellersSharePercent,
    ticketMedio: storeResult.ticketMedio || 0,
    ticketGoal: goalConfig.storeTicketGoal || 47,
    clientsCount: storeResult.clientsCount || 0,
    itemsCount: storeResult.itemsCount || 0,
    unitsCount: storeResult.unitsCount || 0,
    discountPercent: storeResult.discountPercent || 0,
    remainingGoal,
    dailyRequiredSales,
    expectedPacePercent,
    daysRemaining,
    status,
  };
}
