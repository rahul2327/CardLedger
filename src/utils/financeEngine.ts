import type {
  AppSettings,
  BillingStatement,
  CardSummary,
  CreditCard,
  DashboardSummary,
  PaymentStatus,
  Transaction,
  UpcomingBillItem,
} from '../types/finance';

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const rounded = sign * (Math.round(Math.abs(value) * 100 + 1e-9) / 100);
  return rounded === 0 ? 0 : rounded;
}

export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
}

export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateParts(dateStr: string): {year: number; month: number; day: number} {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {year: y, month: m, day: d};
}

export function formatDateParts(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function clampDayToMonth(year: number, month: number, day: number): string {
  const maxDay = daysInMonth(year, month);
  const clamped = Math.max(1, Math.min(day, maxDay));
  return formatDateParts(year, month, clamped);
}

export function shiftYearMonth(year: number, month: number, deltaMonths: number): {year: number; month: number} {
  const totalMonths = year * 12 + (month - 1) + deltaMonths;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = ((totalMonths % 12) + 12) % 12 + 1;
  return {year: newYear, month: newMonth};
}

export function addDaysToDateString(dateStr: string, deltaDays: number): string {
  const {year, month, day} = parseDateParts(dateStr);
  const dt = new Date(year, month - 1, day + deltaDays);
  return formatDateParts(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function daysBetweenDateStrings(fromDateStr: string, toDateStr: string): number {
  const a = parseDateParts(fromDateStr);
  const b = parseDateParts(toDateStr);
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Computes the payment due date for a statement generated on `statementDate`.
 * If dueDay is meaningfully after billingDay in the same calendar month (>= 5 days later),
 * the due date falls in that same month; otherwise it falls in the following calendar month.
 */
export function getDueDateForStatement(
  statementDate: string,
  billingDay: number,
  dueDay: number
): string {
  const {year, month} = parseDateParts(statementDate);
  if (dueDay > billingDay && dueDay - billingDay >= 5) {
    return clampDayToMonth(year, month, dueDay);
  }
  const next = shiftYearMonth(year, month, 1);
  return clampDayToMonth(next.year, next.month, dueDay);
}

export interface CycleWindow {
  cycleKey: string;
  cycleStart: string;
  statementDate: string;
  dueDate: string;
}

/**
 * Builds the exact cycle window ending on the statement date in (year, month).
 * A billing cycle covers (previousStatementDate, statementDate], i.e.
 * from (previousStatementDate + 1 day) through statementDate inclusive.
 */
export function buildCycleWindow(
  year: number,
  month: number,
  billingDay: number,
  dueDay: number
): CycleWindow {
  const statementDate = clampDayToMonth(year, month, billingDay);
  const prevYM = shiftYearMonth(year, month, -1);
  const prevStatementDate = clampDayToMonth(prevYM.year, prevYM.month, billingDay);
  const cycleStart = addDaysToDateString(prevStatementDate, 1);
  const dueDate = getDueDateForStatement(statementDate, billingDay, dueDay);
  return {
    cycleKey: statementDate,
    cycleStart,
    statementDate,
    dueDate,
  };
}

/**
 * Returns the billing cycle window that owns a given transaction date.
 */
export function getCycleWindowForTransactionDate(
  txDate: string,
  billingDay: number,
  dueDay: number
): CycleWindow {
  const {year, month} = parseDateParts(txDate);
  const thisMonthStmt = clampDayToMonth(year, month, billingDay);
  if (txDate <= thisMonthStmt) {
    return buildCycleWindow(year, month, billingDay, dueDay);
  }
  const nextYM = shiftYearMonth(year, month, 1);
  return buildCycleWindow(nextYM.year, nextYM.month, billingDay, dueDay);
}

/**
 * Returns the current open (unbilled) cycle as of `today`.
 * Any cycle with statementDate <= today is considered already generated.
 * The current open cycle is therefore the earliest cycle with statementDate > today.
 */
export function getCurrentOpenCycleWindow(
  today: string,
  billingDay: number,
  dueDay: number
): CycleWindow {
  const {year, month} = parseDateParts(today);
  const thisMonthStmt = clampDayToMonth(year, month, billingDay);
  if (today < thisMonthStmt) {
    return buildCycleWindow(year, month, billingDay, dueDay);
  }
  const nextYM = shiftYearMonth(year, month, 1);
  return buildCycleWindow(nextYM.year, nextYM.month, billingDay, dueDay);
}

/**
 * Preview next statement & payment due date for card configuration forms.
 */
export function previewCardSchedule(
  billingDay: number,
  dueDay: number,
  today: string = getTodayDateString()
): {
  currentCycleStart: string;
  nextStatementDate: string;
  nextStatementDueDate: string;
  latestStatementDate: string;
  latestStatementDueDate: string;
} {
  const openCycle = getCurrentOpenCycleWindow(today, billingDay, dueDay);
  const {year, month} = parseDateParts(openCycle.statementDate);
  const latestYM = shiftYearMonth(year, month, -1);
  const latestCycle = buildCycleWindow(latestYM.year, latestYM.month, billingDay, dueDay);

  return {
    currentCycleStart: openCycle.cycleStart,
    nextStatementDate: openCycle.statementDate,
    nextStatementDueDate: openCycle.dueDate,
    latestStatementDate: latestCycle.statementDate,
    latestStatementDueDate: latestCycle.dueDate,
  };
}

function determineStatementStatus(
  billedAmount: number,
  paidAmount: number,
  remainingAmount: number,
  dueDate: string,
  isGenerated: boolean,
  today: string
): PaymentStatus {
  if (billedAmount <= 0) {
    return 'no_bill';
  }
  if (remainingAmount <= 0) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partially_paid';
  }
  if (isGenerated && dueDate < today) {
    return 'overdue';
  }
  return 'unpaid';
}

/**
 * Computes full card billing cycles, statements, FIFO payment allocation,
 * current unbilled spending, and outstanding balances without double-counting.
 */
export function computeCardSummary(
  card: CreditCard,
  allTransactions: Transaction[],
  today: string = getTodayDateString()
): CardSummary {
  const cardTxs = allTransactions.filter((t) => t.cardId === card.id);
  const spendTxs = cardTxs.filter((t) => t.type === 'spend');
  const paymentTxs = cardTxs.filter((t) => t.type === 'payment');

  const totalSpend = roundMoney(spendTxs.reduce((acc, tx) => acc + tx.amount, 0));
  const totalPayments = roundMoney(paymentTxs.reduce((acc, tx) => acc + tx.amount, 0));
  const currentOutstanding = Math.max(0, roundMoney(totalSpend - totalPayments));
  const creditSurplus = Math.max(0, roundMoney(totalPayments - totalSpend));

  const openCycleWin = getCurrentOpenCycleWindow(today, card.billingDay, card.dueDay);
  const openParts = parseDateParts(openCycleWin.statementDate);
  const latestYM = shiftYearMonth(openParts.year, openParts.month, -1);
  const prevYM = shiftYearMonth(openParts.year, openParts.month, -2);

  const latestWin = buildCycleWindow(latestYM.year, latestYM.month, card.billingDay, card.dueDay);
  const prevWin = buildCycleWindow(prevYM.year, prevYM.month, card.billingDay, card.dueDay);

  // Build map of all relevant billing cycles: always include current open cycle, latest closed, and previous closed,
  // plus every cycle that contains spending transactions.
  const cycleMap = new Map<
    string,
    {
      window: CycleWindow;
      billedAmount: number;
      transactionCount: number;
      paidAmount: number;
    }
  >();

  const ensureCycle = (win: CycleWindow) => {
    if (!cycleMap.has(win.cycleKey)) {
      cycleMap.set(win.cycleKey, {
        window: win,
        billedAmount: 0,
        transactionCount: 0,
        paidAmount: 0,
      });
    }
    return cycleMap.get(win.cycleKey)!;
  };

  ensureCycle(openCycleWin);
  ensureCycle(latestWin);
  ensureCycle(prevWin);

  for (const tx of spendTxs) {
    const win = getCycleWindowForTransactionDate(tx.date, card.billingDay, card.dueDay);
    const entry = ensureCycle(win);
    entry.billedAmount = roundMoney(entry.billedAmount + tx.amount);
    entry.transactionCount += 1;
  }

  // Sort cycles chronologically (oldest statement date first) for FIFO settlement.
  const chronologicalCycles = Array.from(cycleMap.values()).sort((a, b) =>
    a.window.statementDate.localeCompare(b.window.statementDate)
  );

  // Step 1: Apply payments explicitly targeting a specific statementCycleKey
  let unallocatedPaymentPool = 0;
  for (const payment of paymentTxs) {
    if (payment.statementCycleKey && cycleMap.has(payment.statementCycleKey)) {
      const target = cycleMap.get(payment.statementCycleKey)!;
      const room = Math.max(0, roundMoney(target.billedAmount - target.paidAmount));
      const applied = Math.min(payment.amount, room);
      target.paidAmount = roundMoney(target.paidAmount + applied);
      const overflow = roundMoney(payment.amount - applied);
      if (overflow > 0) {
        unallocatedPaymentPool = roundMoney(unallocatedPaymentPool + overflow);
      }
    } else {
      unallocatedPaymentPool = roundMoney(unallocatedPaymentPool + payment.amount);
    }
  }

  // Step 2: Apply remaining payment pool chronologically (FIFO) across all cycles:
  // Generated statements settle oldest-first before any payment offsets current unbilled cycle.
  for (const entry of chronologicalCycles) {
    if (unallocatedPaymentPool <= 0) break;
    const room = Math.max(0, roundMoney(entry.billedAmount - entry.paidAmount));
    if (room <= 0) continue;
    const applied = Math.min(unallocatedPaymentPool, room);
    entry.paidAmount = roundMoney(entry.paidAmount + applied);
    unallocatedPaymentPool = roundMoney(unallocatedPaymentPool - applied);
  }

  // Convert into final BillingStatement objects
  const allStatements: BillingStatement[] = chronologicalCycles.map((entry) => {
    const isGenerated = entry.window.statementDate <= today;
    const remainingAmount = Math.max(0, roundMoney(entry.billedAmount - entry.paidAmount));
    const status = determineStatementStatus(
      entry.billedAmount,
      entry.paidAmount,
      remainingAmount,
      entry.window.dueDate,
      isGenerated,
      today
    );
    return {
      cycleKey: entry.window.cycleKey,
      cardId: card.id,
      cycleStart: entry.window.cycleStart,
      statementDate: entry.window.statementDate,
      dueDate: entry.window.dueDate,
      isGenerated,
      billedAmount: entry.billedAmount,
      paidAmount: entry.paidAmount,
      remainingAmount,
      status,
      transactionCount: entry.transactionCount,
    };
  });

  const currentCycle =
    allStatements.find((s) => s.cycleKey === openCycleWin.cycleKey) || {
      cycleKey: openCycleWin.cycleKey,
      cardId: card.id,
      cycleStart: openCycleWin.cycleStart,
      statementDate: openCycleWin.statementDate,
      dueDate: openCycleWin.dueDate,
      isGenerated: false,
      billedAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      status: 'no_bill',
      transactionCount: 0,
    };

  // Generated statements sorted newest first; keep latest & previous always visible,
  // and keep older cycles if they had any spend.
  const generatedStatements = allStatements
    .filter(
      (s) =>
        s.isGenerated &&
        (s.billedAmount > 0 ||
          s.cycleKey === latestWin.cycleKey ||
          s.cycleKey === prevWin.cycleKey)
    )
    .sort((a, b) => b.statementDate.localeCompare(a.statementDate));

  const latestStatement =
    generatedStatements.find((s) => s.cycleKey === latestWin.cycleKey) ??
    generatedStatements[0] ??
    null;

  const previousStatement =
    generatedStatements.find((s) => s.cycleKey === prevWin.cycleKey) ??
    generatedStatements[1] ??
    null;

  // Upcoming bill amount = sum of unpaid remaining amounts on GENERATED statements only (no double-counting!)
  const upcomingBillAmount = roundMoney(
    generatedStatements.reduce((acc, stmt) => acc + stmt.remainingAmount, 0)
  );

  // Net unbilled spend = current open cycle remaining + any future-dated cycles remaining
  const unbilledCycles = allStatements.filter((s) => !s.isGenerated);
  const futureUnbilledAmount = roundMoney(
    unbilledCycles.reduce((acc, stmt) => acc + stmt.remainingAmount, 0)
  );
  const unbilledTransactionCount = unbilledCycles.reduce(
    (acc, stmt) => acc + stmt.transactionCount,
    0
  );

  // Earliest due date among unpaid generated statements, otherwise current cycle's due date
  const unpaidGeneratedSortedByDue = generatedStatements
    .filter((s) => s.remainingAmount > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextDueDate =
    unpaidGeneratedSortedByDue.length > 0
      ? unpaidGeneratedSortedByDue[0].dueDate
      : currentCycle.dueDate;

  const remainingLimit =
    card.limit !== null ? roundMoney(card.limit - currentOutstanding) : null;

  const utilizationPercent =
    card.limit !== null && card.limit > 0
      ? Math.min(999, Math.round((currentOutstanding / card.limit) * 1000) / 10)
      : null;

  return {
    card,
    totalSpend,
    totalPayments,
    currentOutstanding,
    creditSurplus,
    remainingLimit,
    utilizationPercent,
    currentCycle,
    latestStatement,
    previousStatement,
    generatedStatements,
    upcomingBillAmount,
    currentUnbilledAmount: futureUnbilledAmount,
    unbilledTransactionCount,
    nextDueDate,
    nextStatementDate: currentCycle.statementDate,
  };
}

/**
 * Computes the complete dashboard summary from settings, cards, and transactions.
 */
export function computeDashboardSummary(
  settings: AppSettings,
  cards: CreditCard[],
  transactions: Transaction[],
  today: string = getTodayDateString()
): DashboardSummary {
  const cardSummaries = cards.map((card) => computeCardSummary(card, transactions, today));

  const totalCCOutstanding = roundMoney(
    cardSummaries.reduce((acc, cs) => acc + cs.currentOutstanding, 0)
  );

  const upcomingCCBills = roundMoney(
    cardSummaries.reduce((acc, cs) => acc + cs.upcomingBillAmount, 0)
  );

  const currentUnbilledTotal = roundMoney(
    cardSummaries.reduce((acc, cs) => acc + cs.currentUnbilledAmount, 0)
  );

  const balanceAfterCCPayments = roundMoney(settings.bankBalance - totalCCOutstanding);

  // Collect all unpaid generated statements across cards, sorted by soonest due date
  const upcomingDueBills: UpcomingBillItem[] = [];
  for (const cs of cardSummaries) {
    for (const stmt of cs.generatedStatements) {
      if (stmt.remainingAmount > 0) {
        upcomingDueBills.push({
          card: cs.card,
          statement: stmt,
          daysUntilDue: daysBetweenDateStrings(today, stmt.dueDate),
        });
      }
    }
  }
  upcomingDueBills.sort((a, b) => a.statement.dueDate.localeCompare(b.statement.dueDate));

  return {
    bankBalance: roundMoney(settings.bankBalance),
    totalCCOutstanding,
    upcomingCCBills,
    currentUnbilledTotal,
    balanceAfterCCPayments,
    cardSummaries,
    upcomingDueBills,
  };
}
