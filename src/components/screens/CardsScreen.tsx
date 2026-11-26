import React, {useMemo} from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard as CreditCardIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  CardSummary,
  CreditCard,
  CurrencyCode,
  Transaction,
} from '../../types/finance';
import {
  CARD_COLOR_TOKENS,
  formatDayMonth,
  formatMoney,
  formatOrdinalDay,
  formatPaymentStatusLabel,
  formatShortDate,
} from '../../utils/formatters';
import type {TransactionModalPreset} from '../modals/TransactionFormModal';

interface CardsScreenProps {
  cardSummaries: CardSummary[];
  transactions: Transaction[];
  selectedCardId: string | null;
  currency: CurrencyCode;
  onSelectCard: (cardId: string | null) => void;
  onAddCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (card: CreditCard) => void;
  onOpenTransactionModal: (preset?: TransactionModalPreset) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export const CardsScreen: React.FC<CardsScreenProps> = ({
  cardSummaries,
  transactions,
  selectedCardId,
  currency,
  onSelectCard,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const activeSummary = useMemo(() => {
    if (cardSummaries.length === 0) return null;
    return cardSummaries.find((cs) => cs.card.id === selectedCardId) ?? cardSummaries[0];
  }, [cardSummaries, selectedCardId]);

  const activeCardTransactions = useMemo(() => {
    if (!activeSummary) return [];
    return transactions.filter((t) => t.cardId === activeSummary.card.id);
  }, [transactions, activeSummary]);

  if (cardSummaries.length === 0) {
    return (
      <div className="rounded-[28px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-10 text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center mx-auto">
          <CreditCardIcon className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-m3-on-surface">No credit cards yet</h2>
        <p className="mt-1.5 text-sm text-m3-on-surface-variant">
          Add cards such as Axis, Kiwi, or HDFC with their billing day and due date to start
          tracking spending and statements.
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
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-m3-on-surface">Your Credit Cards</h2>
          <p className="text-xs text-m3-on-surface-variant">
            Select a card to inspect billing cycles and activity
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCard}
          className="h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Card</span>
        </button>
      </div>

      {/* Card Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardSummaries.map((cs) => {
          const isSelected = activeSummary?.card.id === cs.card.id;
          const tone = CARD_COLOR_TOKENS[cs.card.colorToken];
          const utilPct = cs.utilizationPercent !== null ? Math.min(100, cs.utilizationPercent) : null;
          const isOverLimit = cs.remainingLimit !== null && cs.remainingLimit < 0;

          return (
            <button
              key={cs.card.id}
              type="button"
              onClick={() => onSelectCard(cs.card.id)}
              aria-pressed={isSelected}
              className={`text-left rounded-[24px] p-5 border transition-colors flex flex-col justify-between gap-4 ${
                isSelected
                  ? 'bg-m3-primary-container/45 dark:bg-m3-primary-container/35 border-m3-primary'
                  : 'bg-m3-surface-lowest dark:bg-m3-surface-container border-m3-outline-variant/60 hover:bg-m3-surface-low'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl ${tone.softBg} ${tone.accentText} flex items-center justify-center font-display font-semibold text-sm shrink-0`}
                  >
                    {cs.card.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-m3-on-surface truncate">
                      {cs.card.name}
                    </p>
                    <p className="text-xs text-m3-on-surface-variant">
                      {cs.card.lastFour ? `••${cs.card.lastFour} · ` : ''}
                      Bill {formatOrdinalDay(cs.card.billingDay)} · Due{' '}
                      {formatOrdinalDay(cs.card.dueDay)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-m3-on-surface-variant">Current Outstanding</p>
                <p className="mt-0.5 text-2xl font-semibold font-mono tabular-nums text-m3-on-surface">
                  {formatMoney(cs.currentOutstanding, currency)}
                </p>
                {cs.card.limit !== null && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
                      <span className={isOverLimit ? 'text-m3-error font-medium' : ''}>
                        {isOverLimit ? 'Over limit' : 'Remaining'}{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(Math.abs(cs.remainingLimit ?? 0), currency)}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {cs.utilizationPercent}% of {formatMoney(cs.card.limit, currency, {compact: true})}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-m3-surface-high overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOverLimit || (utilPct ?? 0) >= 80
                            ? 'bg-m3-error'
                            : (utilPct ?? 0) >= 50
                              ? 'bg-m3-tertiary'
                              : tone.swatch
                        }`}
                        style={{width: `${Math.max(utilPct ?? 0, cs.currentOutstanding > 0 ? 2 : 0)}%`}}
                      />
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Card Detailed Ledger */}
      {activeSummary && (
        <section className="rounded-[28px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
          {/* Card Detail Header */}
          <div className="p-6 border-b border-m3-outline-variant/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    CARD_COLOR_TOKENS[activeSummary.card.colorToken].swatch
                  }`}
                />
                <h3 className="text-xl font-semibold text-m3-on-surface">
                  {activeSummary.card.name}
                  {activeSummary.card.lastFour ? (
                    <span className="ml-2 text-sm font-mono font-normal text-m3-on-surface-variant">
                      •••• {activeSummary.card.lastFour}
                    </span>
                  ) : null}
                </h3>
              </div>
              <p className="mt-1 text-xs text-m3-on-surface-variant">
                Billing date: {formatOrdinalDay(activeSummary.card.billingDay)} of each month ·
                Payment due: {formatOrdinalDay(activeSummary.card.dueDay)} · Next statement:{' '}
                {formatShortDate(activeSummary.nextStatementDate)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onOpenTransactionModal({type: 'spend', cardId: activeSummary.card.id})
                }
                className="h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Spend</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenTransactionModal({
                    type: 'payment',
                    cardId: activeSummary.card.id,
                    amount:
                      activeSummary.upcomingBillAmount > 0
                        ? activeSummary.upcomingBillAmount
                        : activeSummary.currentOutstanding > 0
                          ? activeSummary.currentOutstanding
                          : undefined,
                    description: `${activeSummary.card.name} Bill Payment`,
                  })
                }
                className="h-10 px-4 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Pay Bill</span>
              </button>
              <button
                type="button"
                onClick={() => onEditCard(activeSummary.card)}
                aria-label={`Edit ${activeSummary.card.name}`}
                className="h-10 w-10 rounded-full bg-m3-surface-high text-m3-on-surface-variant hover:text-m3-on-surface flex items-center justify-center transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteCard(activeSummary.card)}
                aria-label={`Delete ${activeSummary.card.name}`}
                className="h-10 w-10 rounded-full bg-m3-surface-high text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/50 flex items-center justify-center transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4-Column Card Billing Cycle Metrics Strip (flat dividers, no nested cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-m3-outline-variant/50 bg-m3-surface-low/50 border-b border-m3-outline-variant/50">
            <div className="p-5">
              <p className="text-xs text-m3-on-surface-variant">Current Outstanding</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-m3-on-surface">
                {formatMoney(activeSummary.currentOutstanding, currency)}
              </p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                {activeSummary.remainingLimit !== null
                  ? `Limit ${formatMoney(activeSummary.card.limit ?? 0, currency)}`
                  : 'No limit set'}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-m3-on-surface-variant">Upcoming Bill (Generated)</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-m3-on-surface">
                {formatMoney(activeSummary.upcomingBillAmount, currency)}
              </p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                {activeSummary.latestStatement
                  ? `${formatPaymentStatusLabel(activeSummary.latestStatement.status)} · Due ${formatDayMonth(activeSummary.latestStatement.dueDate)}`
                  : 'No statement yet'}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-m3-on-surface-variant">Current Cycle (Unbilled)</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-m3-on-surface">
                {formatMoney(activeSummary.currentUnbilledAmount, currency)}
              </p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                {formatDayMonth(activeSummary.currentCycle.cycleStart)} –{' '}
                {formatDayMonth(activeSummary.currentCycle.statementDate)}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-m3-on-surface-variant">Previous Statement</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-m3-on-surface">
                {activeSummary.previousStatement
                  ? formatMoney(activeSummary.previousStatement.billedAmount, currency)
                  : formatMoney(0, currency)}
              </p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                {activeSummary.previousStatement
                  ? `${formatPaymentStatusLabel(activeSummary.previousStatement.status)} · ${formatDayMonth(activeSummary.previousStatement.statementDate)}`
                  : 'No prior bill'}
              </p>
            </div>
          </div>

          {/* Card Statements + Transactions Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-m3-outline-variant/50">
            {/* Statements List */}
            <div className="lg:col-span-5 p-6 space-y-4">
              <h4 className="text-sm font-semibold text-m3-on-surface">Statement History</h4>

              <div className="divide-y divide-m3-outline-variant/50">
                {activeSummary.generatedStatements.map((stmt) => (
                  <div key={stmt.cycleKey} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-m3-on-surface">
                          {formatDayMonth(stmt.cycleStart)} – {formatShortDate(stmt.statementDate)}
                        </p>
                        <p className="text-xs text-m3-on-surface-variant">
                          Due {formatShortDate(stmt.dueDate)} · {stmt.transactionCount}{' '}
                          {stmt.transactionCount === 1 ? 'spend' : 'spends'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono tabular-nums text-m3-on-surface">
                          {formatMoney(stmt.billedAmount, currency)}
                        </p>
                        <StatusInline status={stmt.status} />
                      </div>
                    </div>

                    {stmt.remainingAmount > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs text-m3-on-surface-variant">
                          Remaining:{' '}
                          <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                            {formatMoney(stmt.remainingAmount, currency)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenTransactionModal({
                              type: 'payment',
                              cardId: activeSummary.card.id,
                              amount: stmt.remainingAmount,
                              description: `${activeSummary.card.name} Statement Payment`,
                              statementCycleKey: stmt.cycleKey,
                            })
                          }
                          className="min-h-[34px] px-3.5 rounded-full bg-m3-primary-container text-m3-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Pay Bill
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Card Transactions List */}
            <div className="lg:col-span-7 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-m3-on-surface">
                  Card Activity ({activeCardTransactions.length})
                </h4>
                {activeSummary.creditSurplus > 0 && (
                  <span className="text-xs font-medium text-m3-success font-mono tabular-nums">
                    Credit surplus: {formatMoney(activeSummary.creditSurplus, currency)}
                  </span>
                )}
              </div>

              {activeCardTransactions.length === 0 ? (
                <p className="text-sm text-m3-on-surface-variant py-6">
                  No spending or payments logged on {activeSummary.card.name} yet.
                </p>
              ) : (
                <div className="divide-y divide-m3-outline-variant/50">
                  {activeCardTransactions.map((tx) => {
                    const isPayment = tx.type === 'payment';
                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isPayment
                                ? 'bg-m3-success-container text-m3-on-success-container'
                                : 'bg-m3-surface-high text-m3-on-surface-variant'
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
                            <p className="text-xs text-m3-on-surface-variant">
                              {formatShortDate(tx.date)} · {isPayment ? 'Payment' : 'Spend'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
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
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const StatusInline: React.FC<{status: CardSummary['currentCycle']['status']}> = ({status}) => {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Paid</span>
      </span>
    );
  }
  if (status === 'partially_paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-tertiary">
        <Clock className="w-3.5 h-3.5" />
        <span>Partially Paid</span>
      </span>
    );
  }
  if (status === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-error">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Overdue</span>
      </span>
    );
  }
  if (status === 'unpaid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-tertiary">
        <Clock className="w-3.5 h-3.5" />
        <span>Unpaid</span>
      </span>
    );
  }
  return <span className="text-xs text-m3-on-surface-variant">No Bill</span>;
};
