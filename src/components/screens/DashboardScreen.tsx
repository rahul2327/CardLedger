import React from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard as CreditCardIcon,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AppSettings,
  CardSummary,
  DashboardSummary,
  NavTab,
  Transaction,
} from '../../types/finance';
import {
  CARD_COLOR_TOKENS,
  formatDayMonth,
  formatDueCountdown,
  formatMoney,
  formatOrdinalDay,
  formatPaymentStatusLabel,
  formatShortDate,
} from '../../utils/formatters';
import type {TransactionModalPreset} from '../modals/TransactionFormModal';

interface DashboardScreenProps {
  settings: AppSettings;
  summary: DashboardSummary;
  transactions: Transaction[];
  onNavigate: (tab: NavTab) => void;
  onSelectCardDetail: (cardId: string) => void;
  onEditBankBalance: () => void;
  onAddCard: () => void;
  onOpenTransactionModal: (preset?: TransactionModalPreset) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onLoadSampleData: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  settings,
  summary,
  transactions,
  onNavigate,
  onSelectCardDetail,
  onEditBankBalance,
  onAddCard,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
  onLoadSampleData,
}) => {
  const {currency} = settings;
  const recentTransactions = transactions.slice(0, 6);
  const cardById = new Map(summary.cardSummaries.map((cs) => [cs.card.id, cs.card]));
  const isShortfall = summary.balanceAfterCCPayments < 0;

  return (
    <div className="space-y-5">
      {/* Top 4 Material 3 Financial Metric Cards */}
      <section aria-label="Financial overview" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* 1. Bank Balance */}
        <div className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-m3-on-surface-variant">Bank Balance</p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant/80 truncate">
                {settings.bankName}
              </p>
            </div>
            <button
              type="button"
              onClick={onEditBankBalance}
              className="h-9 px-3.5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>{settings.bankAccounts.length > 1 ? 'Manage' : 'Update'}</span>
            </button>
          </div>
          <div>
            <p className="text-2xl sm:text-[28px] font-semibold font-mono tabular-nums tracking-tight text-m3-on-surface">
              {formatMoney(summary.bankBalance, currency)}
            </p>
            {settings.bankAccounts.length > 1 ? (
              <div className="mt-2.5 pt-2.5 border-t border-m3-outline-variant/40 space-y-1">
                {settings.bankAccounts.slice(0, 3).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-2 text-xs text-m3-on-surface-variant"
                  >
                    <span className="truncate">{acc.name}</span>
                    <span className="font-mono tabular-nums font-medium text-m3-on-surface shrink-0">
                      {formatMoney(acc.balance, currency)}
                    </span>
                  </div>
                ))}
                {settings.bankAccounts.length > 3 && (
                  <button
                    type="button"
                    onClick={onEditBankBalance}
                    className="text-xs font-medium text-m3-primary hover:underline pt-0.5"
                  >
                    +{settings.bankAccounts.length - 3} more accounts
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-m3-on-surface-variant">
                {settings.bankAccounts.length === 0
                  ? 'Tap Update to add a bank account'
                  : 'Available cash on hand'}
              </p>
            )}
          </div>
        </div>

        {/* 2. Total CC Outstanding */}
        <div className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-m3-on-surface-variant">Total CC Outstanding</p>
            <CreditCardIcon className="w-4 h-4 text-m3-on-surface-variant shrink-0" />
          </div>
          <div>
            <p className="text-2xl sm:text-[28px] font-semibold font-mono tabular-nums tracking-tight text-m3-on-surface">
              {formatMoney(summary.totalCCOutstanding, currency)}
            </p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              <span className="font-mono tabular-nums">
                {formatMoney(summary.upcomingCCBills, currency)}
              </span>{' '}
              billed ·{' '}
              <span className="font-mono tabular-nums">
                {formatMoney(summary.currentUnbilledTotal, currency)}
              </span>{' '}
              unbilled
            </p>
          </div>
        </div>

        {/* 3. Upcoming CC Bills */}
        <div className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-m3-on-surface-variant">Upcoming CC Bills</p>
            <ReceiptText className="w-4 h-4 text-m3-tertiary shrink-0" />
          </div>
          <div>
            <p className="text-2xl sm:text-[28px] font-semibold font-mono tabular-nums tracking-tight text-m3-on-surface">
              {formatMoney(summary.upcomingCCBills, currency)}
            </p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              {summary.upcomingDueBills.length > 0 ? (
                <>
                  {summary.upcomingDueBills.length}{' '}
                  {summary.upcomingDueBills.length === 1 ? 'unpaid bill' : 'unpaid bills'} · Next{' '}
                  {formatDayMonth(summary.upcomingDueBills[0].statement.dueDate)}
                </>
              ) : (
                'All generated statements settled'
              )}
            </p>
          </div>
        </div>

        {/* 4. Balance After CC Payments (Dominant Focal Anchor Card) */}
        <div
          className={`rounded-[24px] p-4 sm:p-5 flex flex-col justify-between gap-3.5 border ${
            isShortfall
              ? 'bg-m3-error-container text-m3-on-error-container border-m3-error/25'
              : 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/15'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium opacity-90">Balance After CC Payments</p>
            <Landmark className="w-4 h-4 opacity-80 shrink-0" />
          </div>
          <div>
            <p className="text-2xl sm:text-[28px] font-semibold font-mono tabular-nums tracking-tight">
              {formatMoney(summary.balanceAfterCCPayments, currency)}
            </p>
            <p className="mt-1 text-xs opacity-85 flex items-center gap-1.5">
              {isShortfall ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Shortfall — CC dues exceed bank balance</span>
                </>
              ) : (
                <span>Bank balance minus total CC dues</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* First-Time Empty Onboarding */}
      {summary.cardSummaries.length === 0 ? (
        <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-6 sm:p-8 text-center max-w-2xl mx-auto">
          <div className="w-11 h-11 rounded-2xl bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center mx-auto">
            <CreditCardIcon className="w-5 h-5" />
          </div>
          <h2 className="mt-3.5 text-lg font-semibold text-m3-on-surface">
            Track your credit cards and bank balance offline
          </h2>
          <p className="mt-1.5 text-[13px] text-m3-on-surface-variant max-w-md mx-auto leading-relaxed">
            Add your credit cards with their billing and payment due dates, enter your bank
            balance, and keep all data stored privately on this device.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onAddCard}
              className="h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add First Card</span>
            </button>
            <button
              type="button"
              onClick={onEditBankBalance}
              className="h-10 px-4 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span>Set Bank Balance</span>
            </button>
            <button
              type="button"
              onClick={onLoadSampleData}
              className="h-10 px-4 rounded-full bg-m3-surface-high text-m3-on-surface text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-m3-primary shrink-0" />
              <span>Load Sample Cards</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Credit Cards Overview & Recent Transactions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Credit Cards Overview */}
            <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-m3-outline-variant/50">
                <div>
                  <h2 className="text-base font-semibold text-m3-on-surface">
                    Credit Cards Overview
                  </h2>
                  <p className="text-xs text-m3-on-surface-variant">
                    {summary.cardSummaries.length}{' '}
                    {summary.cardSummaries.length === 1 ? 'card' : 'cards'} tracked locally
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('cards')}
                  className="min-h-[40px] px-3 rounded-full text-xs font-medium text-m3-primary hover:bg-m3-surface-low inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Manage Cards</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-m3-outline-variant/50">
                {summary.cardSummaries.map((cs: CardSummary) => {
                  const tone = CARD_COLOR_TOKENS[cs.card.colorToken];
                  const utilPct = cs.utilizationPercent !== null ? Math.min(100, cs.utilizationPercent) : null;
                  const isOverLimit = cs.remainingLimit !== null && cs.remainingLimit < 0;

                  return (
                    <div
                      key={cs.card.id}
                      className="p-5 hover:bg-m3-surface-low/60 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectCardDetail(cs.card.id)}
                          className="flex items-start gap-3.5 text-left min-w-0 group"
                        >
                          <div
                            className={`mt-0.5 w-10 h-10 rounded-2xl ${tone.softBg} ${tone.accentText} flex items-center justify-center shrink-0 font-display font-semibold text-sm`}
                          >
                            {cs.card.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-m3-on-surface group-hover:text-m3-primary transition-colors truncate">
                              {cs.card.name}
                              {cs.card.lastFour ? (
                                <span className="ml-1.5 font-mono font-normal text-xs text-m3-on-surface-variant">
                                  ••{cs.card.lastFour}
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                              Bills {formatOrdinalDay(cs.card.billingDay)} · Due{' '}
                              {formatOrdinalDay(cs.card.dueDay)}
                              {cs.upcomingBillAmount > 0 && (
                                <>
                                  {' '}
                                  ·{' '}
                                  <span className="text-m3-tertiary font-medium">
                                    Bill {formatMoney(cs.upcomingBillAmount, currency)}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <p className="text-base font-semibold font-mono tabular-nums text-m3-on-surface">
                              {formatMoney(cs.currentOutstanding, currency)}
                            </p>
                            <p className="text-xs text-m3-on-surface-variant">
                              {cs.remainingLimit !== null ? (
                                <span className={isOverLimit ? 'text-m3-error font-medium' : ''}>
                                  {isOverLimit ? 'Over limit by ' : 'Available '}
                                  <span className="font-mono tabular-nums">
                                    {formatMoney(Math.abs(cs.remainingLimit), currency)}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  Unbilled{' '}
                                  <span className="font-mono tabular-nums">
                                    {formatMoney(cs.currentUnbilledAmount, currency)}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onOpenTransactionModal({type: 'spend', cardId: cs.card.id})
                            }
                            aria-label={`Add spending on ${cs.card.name}`}
                            className="min-h-[40px] min-w-[40px] rounded-full bg-m3-surface-container hover:bg-m3-primary-container hover:text-m3-on-primary-container text-m3-on-surface-variant flex items-center justify-center transition-colors shrink-0"
                            title="Add spending"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {utilPct !== null && (
                        <div className="mt-3.5 pl-13">
                          <div className="h-1.5 w-full rounded-full bg-m3-surface-high overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOverLimit || utilPct >= 80
                                  ? 'bg-m3-error'
                                  : utilPct >= 50
                                    ? 'bg-m3-tertiary'
                                    : tone.swatch
                              }`}
                              style={{width: `${Math.max(utilPct, cs.currentOutstanding > 0 ? 2 : 0)}%`}}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recent Transactions */}
            <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-m3-outline-variant/50">
                <div>
                  <h2 className="text-base font-semibold text-m3-on-surface">
                    Recent Transactions
                  </h2>
                  <p className="text-xs text-m3-on-surface-variant">
                    Latest card spending and bill payments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="min-h-[40px] px-3 rounded-full text-xs font-medium text-m3-primary hover:bg-m3-surface-low inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-m3-on-surface-variant">
                    No transactions recorded yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenTransactionModal({type: 'spend'})}
                    className="mt-4 h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Spending</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-m3-outline-variant/50">
                  {recentTransactions.map((tx) => {
                    const card = cardById.get(tx.cardId);
                    const isPayment = tx.type === 'payment';

                    return (
                      <div
                        key={tx.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-m3-surface-low/60 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isPayment
                                ? 'bg-m3-success-container text-m3-on-success-container'
                                : 'bg-m3-surface-container text-m3-on-surface-variant'
                            }`}
                          >
                            {isPayment ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-m3-on-surface truncate">
                              {tx.description}
                            </p>
                            <p className="text-xs text-m3-on-surface-variant truncate">
                              {card?.name ?? 'Card'} · {formatShortDate(tx.date)} ·{' '}
                              {isPayment
                                ? tx.deductFromBank && tx.bankAccountId
                                  ? `Paid via ${
                                      settings.bankAccounts.find((a) => a.id === tx.bankAccountId)
                                        ?.name ?? 'Bank'
                                    }`
                                  : 'Payment'
                                : 'Spend'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-sm font-semibold font-mono tabular-nums mr-1 ${
                              isPayment ? 'text-m3-success' : 'text-m3-on-surface'
                            }`}
                          >
                            {isPayment ? '−' : '+'}
                            {formatMoney(tx.amount, currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            aria-label={`Edit ${tx.description}`}
                            className="min-h-[40px] min-w-[40px] rounded-full text-m3-on-surface-variant hover:bg-m3-surface-high flex items-center justify-center transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx)}
                            aria-label={`Delete ${tx.description}`}
                            className="min-h-[40px] min-w-[40px] rounded-full text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Upcoming Payment Dates & Current Cycle Watch */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upcoming Payment Dates */}
            <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-m3-outline-variant/50">
                <div>
                  <h2 className="text-base font-semibold text-m3-on-surface">
                    Upcoming Payment Dates
                  </h2>
                  <p className="text-xs text-m3-on-surface-variant">
                    Generated bills awaiting settlement
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('bills')}
                  className="min-h-[40px] px-3 rounded-full text-xs font-medium text-m3-primary hover:bg-m3-surface-low inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>All Bills</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {summary.upcomingDueBills.length === 0 ? (
                <div className="p-6 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-m3-success-container text-m3-on-success-container flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-m3-on-surface">
                      No unpaid generated statements
                    </p>
                    <p className="mt-0.5 text-xs text-m3-on-surface-variant leading-relaxed">
                      You are caught up on all generated credit card bills. Current-cycle spends
                      will appear here once their statement date arrives.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-m3-outline-variant/50">
                  {summary.upcomingDueBills.map(({card, statement, daysUntilDue}) => {
                    const isOverdue = daysUntilDue < 0;
                    const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 5;
                    const tone = CARD_COLOR_TOKENS[card.colorToken];

                    return (
                      <div key={`${card.id}-${statement.cycleKey}`} className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${tone.swatch} shrink-0`} />
                              <p className="text-sm font-semibold text-m3-on-surface truncate">
                                {card.name}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-m3-on-surface-variant">
                              Statement {formatDayMonth(statement.statementDate)} · Due{' '}
                              <span className="font-medium text-m3-on-surface">
                                {formatShortDate(statement.dueDate)}
                              </span>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-base font-semibold font-mono tabular-nums text-m3-on-surface">
                              {formatMoney(statement.remainingAmount, currency)}
                            </p>
                            <p
                              className={`mt-0.5 text-xs font-medium inline-flex items-center gap-1 ${
                                isOverdue
                                  ? 'text-m3-error'
                                  : isUrgent
                                    ? 'text-m3-tertiary'
                                    : 'text-m3-on-surface-variant'
                              }`}
                            >
                              {isOverdue ? (
                                <AlertCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span>{formatDueCountdown(daysUntilDue)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-xs text-m3-on-surface-variant">
                            {formatPaymentStatusLabel(statement.status)}
                            {statement.paidAmount > 0 && (
                              <>
                                {' '}
                                · Paid{' '}
                                <span className="font-mono tabular-nums">
                                  {formatMoney(statement.paidAmount, currency)}
                                </span>{' '}
                                of{' '}
                                <span className="font-mono tabular-nums">
                                  {formatMoney(statement.billedAmount, currency)}
                                </span>
                              </>
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTransactionModal({
                                type: 'payment',
                                cardId: card.id,
                                amount: statement.remainingAmount,
                                description: `${card.name} Statement Payment`,
                                statementCycleKey: statement.cycleKey,
                              })
                            }
                            className="h-9 px-3.5 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                          >
                            Pay Bill
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Current Billing Cycle Summary (Unbilled) */}
            <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-m3-outline-variant/50">
                <div>
                  <h2 className="text-base font-semibold text-m3-on-surface">
                    Current Cycle Spending
                  </h2>
                  <p className="text-xs text-m3-on-surface-variant">
                    Unbilled activity — not yet generated into a statement
                  </p>
                </div>
                <CalendarClock className="w-4 h-4 text-m3-on-surface-variant shrink-0" />
              </div>

              <div className="divide-y divide-m3-outline-variant/50">
                {summary.cardSummaries.map((cs) => (
                  <div
                    key={cs.card.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-m3-on-surface truncate">
                        {cs.card.name}
                      </p>
                      <p className="text-xs text-m3-on-surface-variant">
                        Next bill {formatDayMonth(cs.nextStatementDate)} ·{' '}
                        {cs.unbilledTransactionCount}{' '}
                        {cs.unbilledTransactionCount === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-mono tabular-nums text-m3-on-surface shrink-0">
                      {formatMoney(cs.currentUnbilledAmount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
