export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type ThemeMode = 'light' | 'dark' | 'system';

export type CardColorToken = 'teal' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';

export type TransactionType = 'spend' | 'payment';

export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'no_bill';

export type NavTab = 'dashboard' | 'cards' | 'bills' | 'history' | 'settings';

export interface AppSettings {
  id: 'app-settings';
  bankBalance: number;
  bankName: string;
  bankUpdatedAt: string;
  currency: CurrencyCode;
  theme: ThemeMode;
}

export interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
  limit: number | null;
  billingDay: number;
  dueDay: number;
  colorToken: CardColorToken;
  createdAt: string;
}

export interface Transaction {
  id: string;
  cardId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD local date
  statementCycleKey?: string;
  deductFromBank?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingStatement {
  cycleKey: string; // statementDate YYYY-MM-DD
  cardId: string;
  cycleStart: string; // YYYY-MM-DD
  statementDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  isGenerated: boolean;
  billedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  transactionCount: number;
}

export interface CardSummary {
  card: CreditCard;
  totalSpend: number;
  totalPayments: number;
  currentOutstanding: number;
  creditSurplus: number;
  remainingLimit: number | null;
  utilizationPercent: number | null;
  currentCycle: BillingStatement;
  latestStatement: BillingStatement | null;
  previousStatement: BillingStatement | null;
  generatedStatements: BillingStatement[];
  upcomingBillAmount: number;
  currentUnbilledAmount: number;
  unbilledTransactionCount: number;
  nextDueDate: string | null;
  nextStatementDate: string;
}

export interface UpcomingBillItem {
  card: CreditCard;
  statement: BillingStatement;
  daysUntilDue: number;
}

export interface DashboardSummary {
  bankBalance: number;
  totalCCOutstanding: number;
  upcomingCCBills: number;
  currentUnbilledTotal: number;
  balanceAfterCCPayments: number;
  cardSummaries: CardSummary[];
  upcomingDueBills: UpcomingBillItem[];
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: 'CardLedger';
  settings: AppSettings;
  cards: CreditCard[];
  transactions: Transaction[];
}
