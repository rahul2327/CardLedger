import type {AppSettings, CreditCard, Transaction} from '../types/finance';
import {
  addDaysToDateString,
  buildCycleWindow,
  getCurrentOpenCycleWindow,
  getTodayDateString,
  parseDateParts,
  shiftYearMonth,
} from './financeEngine';

/**
 * Generates realistic, date-relative sample data (Axis, Kiwi, HDFC) so users can
 * immediately explore billing cycles, paid/partially-paid/unpaid statements, and current-cycle spending.
 */
export function createSampleDataset(currentTheme: AppSettings['theme']): {
  settings: AppSettings;
  cards: CreditCard[];
  transactions: Transaction[];
} {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const {day: todayDay} = parseDateParts(today);

  // Pick billing days relative to today so cards reliably show active upcoming bills and current-cycle spends
  const axisBillingDay = ((todayDay - 8 + 27) % 28) + 1;
  const axisDueDay = ((axisBillingDay + 18 - 1) % 28) + 1;

  const kiwiBillingDay = ((todayDay - 4 + 27) % 28) + 1;
  const kiwiDueDay = ((kiwiBillingDay + 16 - 1) % 28) + 1;

  const hdfcBillingDay = ((todayDay - 12 + 27) % 28) + 1;
  const hdfcDueDay = ((hdfcBillingDay + 19 - 1) % 28) + 1;

  const cards: CreditCard[] = [
    {
      id: 'card-axis-ace',
      name: 'Axis Ace',
      lastFour: '4821',
      limit: 150000,
      billingDay: axisBillingDay,
      dueDay: axisDueDay,
      colorToken: 'teal',
      createdAt: nowIso,
    },
    {
      id: 'card-kiwi-rupay',
      name: 'Kiwi RuPay',
      lastFour: '9104',
      limit: 80000,
      billingDay: kiwiBillingDay,
      dueDay: kiwiDueDay,
      colorToken: 'emerald',
      createdAt: nowIso,
    },
    {
      id: 'card-hdfc-millennia',
      name: 'HDFC Millennia',
      lastFour: '3376',
      limit: 200000,
      billingDay: hdfcBillingDay,
      dueDay: hdfcDueDay,
      colorToken: 'indigo',
      createdAt: nowIso,
    },
  ];

  const getCycles = (billingDay: number, dueDay: number) => {
    const open = getCurrentOpenCycleWindow(today, billingDay, dueDay);
    const p = parseDateParts(open.statementDate);
    const latestYM = shiftYearMonth(p.year, p.month, -1);
    const prevYM = shiftYearMonth(p.year, p.month, -2);
    return {
      open,
      latest: buildCycleWindow(latestYM.year, latestYM.month, billingDay, dueDay),
      prev: buildCycleWindow(prevYM.year, prevYM.month, billingDay, dueDay),
    };
  };

  const axisC = getCycles(axisBillingDay, axisDueDay);
  const kiwiC = getCycles(kiwiBillingDay, kiwiDueDay);
  const hdfcC = getCycles(hdfcBillingDay, hdfcDueDay);

  const clampToToday = (d: string) => (d > today ? today : d);

  const transactions: Transaction[] = [
    // Axis Ace: Previous bill PAID, Latest bill UNPAID, Current cycle has unbilled spending
    {
      id: 'tx-sample-1',
      cardId: 'card-axis-ace',
      type: 'spend',
      amount: 6450,
      description: 'Monthly Electricity & Fiber Broadband',
      category: 'bills',
      date: addDaysToDateString(axisC.prev.cycleStart, 4),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-2',
      cardId: 'card-axis-ace',
      type: 'payment',
      amount: 6450,
      description: 'Axis Ace Previous Statement Settled',
      date: addDaysToDateString(axisC.prev.statementDate, 5),
      statementCycleKey: axisC.prev.cycleKey,
      deductFromBank: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-3',
      cardId: 'card-axis-ace',
      type: 'spend',
      amount: 4280,
      description: 'Grocery Restock & Fresh Produce',
      category: 'food',
      date: addDaysToDateString(axisC.latest.cycleStart, 5),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-4',
      cardId: 'card-axis-ace',
      type: 'spend',
      amount: 3190,
      description: 'Fuel Refill — Highway Station',
      category: 'fuel',
      date: addDaysToDateString(axisC.latest.statementDate, -2),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-5',
      cardId: 'card-axis-ace',
      type: 'spend',
      amount: 1850,
      description: 'Pharmacy & Wellness Supplies',
      category: 'health',
      date: clampToToday(addDaysToDateString(axisC.open.cycleStart, 2)),
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // Kiwi RuPay: Latest bill PARTIALLY PAID + Current cycle UPI spends
    {
      id: 'tx-sample-6',
      cardId: 'card-kiwi-rupay',
      type: 'spend',
      amount: 3800,
      description: 'Local Supermarket UPI Scan',
      category: 'food',
      date: addDaysToDateString(kiwiC.latest.cycleStart, 6),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-7',
      cardId: 'card-kiwi-rupay',
      type: 'spend',
      amount: 1450,
      description: 'Coffee Roasters & Bakery',
      category: 'food',
      date: addDaysToDateString(kiwiC.latest.statementDate, -3),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-8',
      cardId: 'card-kiwi-rupay',
      type: 'payment',
      amount: 2500,
      description: 'Partial Payment via Bank Transfer',
      date: clampToToday(addDaysToDateString(kiwiC.latest.statementDate, 2)),
      statementCycleKey: kiwiC.latest.cycleKey,
      deductFromBank: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-9',
      cardId: 'card-kiwi-rupay',
      type: 'spend',
      amount: 920,
      description: 'Metro Card Top-Up & Commute',
      category: 'travel',
      date: today,
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // HDFC Millennia: Previous bill PAID, Latest bill UNPAID, Current cycle online order
    {
      id: 'tx-sample-10',
      cardId: 'card-hdfc-millennia',
      type: 'spend',
      amount: 11200,
      description: 'Flight Booking — Domestic Roundtrip',
      category: 'travel',
      date: addDaysToDateString(hdfcC.prev.cycleStart, 9),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-11',
      cardId: 'card-hdfc-millennia',
      type: 'payment',
      amount: 11200,
      description: 'HDFC Millennia Full Bill Paid',
      date: addDaysToDateString(hdfcC.prev.statementDate, 6),
      statementCycleKey: hdfcC.prev.cycleKey,
      deductFromBank: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-12',
      cardId: 'card-hdfc-millennia',
      type: 'spend',
      amount: 8990,
      description: 'Wireless Headphones & Desk Accessories',
      category: 'shopping',
      date: addDaysToDateString(hdfcC.latest.cycleStart, 10),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tx-sample-13',
      cardId: 'card-hdfc-millennia',
      type: 'spend',
      amount: 2499,
      description: 'Annual Cloud Storage & Productivity Suite',
      category: 'bills',
      date: clampToToday(addDaysToDateString(hdfcC.open.cycleStart, 3)),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const settings: AppSettings = {
    id: 'app-settings',
    bankBalance: 86500,
    bankName: '2 Bank Accounts',
    bankUpdatedAt: nowIso,
    bankAccounts: [
      {
        id: 'bank-hdfc-savings',
        name: 'HDFC Savings',
        balance: 62500,
        updatedAt: nowIso,
      },
      {
        id: 'bank-sbi-salary',
        name: 'SBI Salary',
        balance: 24000,
        updatedAt: nowIso,
      },
    ],
    currency: 'INR',
    theme: currentTheme,
  };

  return {settings, cards, transactions};
}
