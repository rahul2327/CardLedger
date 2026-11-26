import React, {useMemo, useState} from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard as CreditCardIcon,
  Plus,
  ReceiptText,
} from 'lucide-react';
import type {
  BillingStatement,
  CardSummary,
  CreditCard,
  CurrencyCode,
  DashboardSummary,
} from '../../types/finance';
import {daysBetweenDateStrings} from '../../utils/financeEngine';
import {
  CARD_COLOR_TOKENS,
  formatDayMonth,
  formatDueCountdown,
  formatMoney,
  formatPaymentStatusLabel,
  formatShortDate,
} from '../../utils/formatters';
import type {TransactionModalPreset} from '../modals/TransactionFormModal';

interface BillsScreenProps {
  summary: DashboardSummary;
  currency: CurrencyCode;
  todayDate: string;
  onAddCard: () => void;
  onOpenTransactionModal: (preset?: TransactionModalPreset) => void;
}

type BillStatusFilter = 'all' | 'unpaid' | 'paid';

export const BillsScreen: React.FC<BillsScreenProps> = ({
  summary,
  currency,
  todayDate,
  onAddCard,
  onOpenTransactionModal,
}) => {
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<BillStatusFilter>('all');

  const filteredCardSummaries = useMemo(() => {
    if (selectedCardFilter === 'all') return summary.cardSummaries;
    return summary.cardSummaries.filter((cs) => cs.card.id === selectedCardFilter);
  }, [summary.cardSummaries, selectedCardFilter]);

  const generatedStatementRows = useMemo(() => {
    const rows: Array<{
      card: CreditCard;
      statement: BillingStatement;
      daysUntilDue: number;
      isLatestForCard: boolean;
    }> = [];

    for (const cs of filteredCardSummaries) {
      for (const stmt of cs.generatedStatements) {
        if (stmt.billedAmount <= 0 && cs.latestStatement?.cycleKey !== stmt.cycleKey) continue;
        if (statusFilter === 'unpaid' && stmt.remainingAmount <= 0) continue;
        if (statusFilter === 'paid' && stmt.status !== 'paid') continue;

        rows.push({
          card: cs.card,
          statement: stmt,
          daysUntilDue: daysBetweenDateStrings(todayDate, stmt.dueDate),
          isLatestForCard: cs.latestStatement?.cycleKey === stmt.cycleKey,
        });
      }
    }

    return rows.sort((a, b) => {
      // Unpaid/overdue bills first, ordered by soonest due date; then settled statements newest first
      const aUnpaid = a.statement.remainingAmount > 0 ? 0 : 1;
      const bUnpaid = b.statement.remainingAmount > 0 ? 0 : 1;
      if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
      if (aUnpaid === 0) return a.statement.dueDate.localeCompare(b.statement.dueDate);
      return b.statement.statementDate.localeCompare(a.statement.statementDate);
    });
  }, [filteredCardSummaries, statusFilter, todayDate]);

  if (summary.cardSummaries.length === 0) {
    return (
      <div className="rounded-[28px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-10 text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center mx-auto">
          <ReceiptText className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-m3-on-surface">
          No billing cycles configured
        </h2>
        <p className="mt-1.5 text-sm text-m3-on-surface-variant">
          Add a credit card with its billing day and payment due day to automatically organize
          statements and current-cycle spending.
        </p>
        <button
          type="button"
          onClick={onAddCard}
          className="mt-5 h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>Add Credit Card</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Accounting Clarity Banner (Zero Double-Counting Summary) */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-m3-outline-variant/50 overflow-hidden">
        <div className="p-5">
          <p className="text-xs font-medium text-m3-on-surface-variant">
            Generated Statements Due
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-m3-on-surface">
            {formatMoney(summary.upcomingCCBills, currency)}
          </p>
          <p className="mt-1 text-xs text-m3-on-surface-variant">
            Billed amounts awaiting payment
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-m3-on-surface-variant">
            Current Cycle Unbilled
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-m3-on-surface">
            {formatMoney(summary.currentUnbilledTotal, currency)}
          </p>
          <p className="mt-1 text-xs text-m3-on-surface-variant">
            Open cycles — billed on next statement date
          </p>
        </div>

        <div className="p-5 bg-m3-surface-low/60">
          <p className="text-xs font-medium text-m3-on-surface-variant">
            Combined CC Outstanding
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-m3-primary">
            {formatMoney(summary.totalCCOutstanding, currency)}
          </p>
          <p className="mt-1 text-xs text-m3-on-surface-variant">
            Billed + Unbilled (counted once)
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="grid grid-cols-3 sm:inline-flex p-1 rounded-full bg-m3-surface-container border border-m3-outline-variant/60 w-full sm:w-auto"
          role="tablist"
          aria-label="Filter bills by status"
        >
          {(['all', 'unpaid', 'paid'] as BillStatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={statusFilter === key}
              onClick={() => setStatusFilter(key)}
              className={`h-9 px-3 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap truncate ${
                statusFilter === key
                  ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                  : 'text-m3-on-surface-variant hover:text-m3-on-surface'
              }`}
            >
              {key === 'all' ? 'All' : key === 'unpaid' ? 'Unpaid' : 'Paid'}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter statements by credit card"
          value={selectedCardFilter}
          onChange={(e) => setSelectedCardFilter(e.target.value)}
          className="h-10 px-4 rounded-full bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant text-[13px] text-m3-on-surface focus:border-m3-primary focus:outline-none"
        >
          <option value="all">All Credit Cards</option>
          {summary.cardSummaries.map((cs) => (
            <option key={cs.card.id} value={cs.card.id}>
              {cs.card.name}
            </option>
          ))}
        </select>
      </div>

      {/* Section 1: Generated Statements */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-m3-outline-variant/50 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-m3-on-surface">Generated Statements</h2>
            <p className="text-xs text-m3-on-surface-variant">
              Closed billing cycles with statement and payment due dates
            </p>
          </div>
          <ReceiptText className="w-4 h-4 text-m3-on-surface-variant shrink-0" />
        </div>

        {generatedStatementRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-m3-on-surface-variant">
            No generated statements match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-m3-outline-variant/50">
            {generatedStatementRows.map(({card, statement, daysUntilDue, isLatestForCard}) => {
              const tone = CARD_COLOR_TOKENS[card.colorToken];
              const hasDue = statement.remainingAmount > 0;
              const isOverdue = hasDue && daysUntilDue < 0;

              return (
                <div
                  key={`${card.id}-${statement.cycleKey}`}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-m3-surface-low/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full ${tone.swatch} shrink-0`} />
                      <span className="text-sm font-semibold text-m3-on-surface">{card.name}</span>
                      <span className="text-xs text-m3-on-surface-variant">
                        · {isLatestForCard ? 'Latest Statement' : 'Previous Statement'}
                      </span>
                    </div>
                    <p className="text-xs text-m3-on-surface-variant">
                      Cycle {formatDayMonth(statement.cycleStart)} –{' '}
                      {formatShortDate(statement.statementDate)} · Due{' '}
                      <span className="text-m3-on-surface font-medium">
                        {formatShortDate(statement.dueDate)}
                      </span>
                      {hasDue && (
                        <>
                          {' '}
                          ·{' '}
                          <span className={isOverdue ? 'text-m3-error font-medium' : 'text-m3-tertiary font-medium'}>
                            {formatDueCountdown(daysUntilDue)}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-m3-on-surface-variant">
                      Billed{' '}
                      <span className="font-mono tabular-nums text-m3-on-surface">
                        {formatMoney(statement.billedAmount, currency)}
                      </span>{' '}
                      · Paid{' '}
                      <span className="font-mono tabular-nums text-m3-success">
                        {formatMoney(statement.paidAmount, currency)}
                      </span>{' '}
                      · {statement.transactionCount}{' '}
                      {statement.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-m3-on-surface-variant">
                        {hasDue ? 'Amount Due' : 'Statement Total'}
                      </p>
                      <p className="text-base font-semibold font-mono tabular-nums text-m3-on-surface">
                        {formatMoney(
                          hasDue ? statement.remainingAmount : statement.billedAmount,
                          currency
                        )}
                      </p>
                      <BillStatusLabel status={statement.status} />
                    </div>

                    {hasDue && (
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
                        className="h-9 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                      >
                        Pay Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Current Billing Cycles (Unbilled) */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-m3-outline-variant/50 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-m3-on-surface">
              Current Billing Cycles (Unbilled)
            </h2>
            <p className="text-xs text-m3-on-surface-variant">
              Active spending cycles separate from generated statements
            </p>
          </div>
          <CalendarClock className="w-4 h-4 text-m3-on-surface-variant shrink-0" />
        </div>

        <div className="divide-y divide-m3-outline-variant/50">
          {filteredCardSummaries.map((cs: CardSummary) => {
            const tone = CARD_COLOR_TOKENS[cs.card.colorToken];
            return (
              <div
                key={cs.card.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${tone.swatch} shrink-0`} />
                    <span className="text-sm font-semibold text-m3-on-surface">
                      {cs.card.name}
                    </span>
                    <span className="text-xs text-m3-on-surface-variant">
                      · Open Cycle
                    </span>
                  </div>
                  <p className="text-xs text-m3-on-surface-variant">
                    Cycle {formatDayMonth(cs.currentCycle.cycleStart)} –{' '}
                    {formatShortDate(cs.currentCycle.statementDate)} · Next due{' '}
                    {formatShortDate(cs.currentCycle.dueDate)}
                  </p>
                  <p className="text-xs text-m3-on-surface-variant">
                    {cs.unbilledTransactionCount}{' '}
                    {cs.unbilledTransactionCount === 1 ? 'spending entry' : 'spending entries'}
                    {cs.currentCycle.paidAmount > 0 && (
                      <>
                        {' '}
                        · Pre-paid{' '}
                        <span className="font-mono tabular-nums text-m3-success">
                          {formatMoney(cs.currentCycle.paidAmount, currency)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-m3-on-surface-variant">Current Unbilled</p>
                    <p className="text-base font-semibold font-mono tabular-nums text-m3-on-surface">
                      {formatMoney(cs.currentUnbilledAmount, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTransactionModal({type: 'spend', cardId: cs.card.id})}
                    className="h-9 px-3.5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <CreditCardIcon className="w-3.5 h-3.5" />
                    <span>Add Spend</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const BillStatusLabel: React.FC<{status: BillingStatement['status']}> = ({status}) => {
  const label = formatPaymentStatusLabel(status);
  if (status === 'paid') {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-m3-success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'overdue') {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-m3-error">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'partially_paid' || status === 'unpaid') {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-m3-tertiary">
        <Clock className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }
  return <span className="mt-0.5 block text-xs text-m3-on-surface-variant">{label}</span>;
};
