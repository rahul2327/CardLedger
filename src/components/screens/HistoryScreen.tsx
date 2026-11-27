import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {BankAccount, CreditCard, CurrencyCode, Transaction} from '../../types/finance';
import {getCategoryLabel, resolveTransactionCategory} from '../../utils/categories';
import {
  getCycleWindowForTransactionDate,
  roundMoney,
} from '../../utils/financeEngine';
import {formatMoney, formatShortDate} from '../../utils/formatters';
import type {TransactionModalPreset} from '../modals/TransactionFormModal';

interface HistoryScreenProps {
  cards: CreditCard[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  currency: CurrencyCode;
  todayDate: string;
  onOpenTransactionModal: (preset?: TransactionModalPreset) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

type TypeFilter = 'all' | 'spend' | 'bank_spend' | 'payment' | 'cashback';
type SortOrder = 'newest' | 'oldest';

const TYPE_FILTER_OPTIONS: Array<{id: TypeFilter; label: string}> = [
  {id: 'all', label: 'All'},
  {id: 'spend', label: 'Card'},
  {id: 'bank_spend', label: 'Bank / UPI'},
  {id: 'payment', label: 'Paid'},
  {id: 'cashback', label: 'Cashback'},
];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  cards,
  bankAccounts,
  transactions,
  currency,
  todayDate,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const bankById = useMemo(() => new Map(bankAccounts.map((b) => [b.id, b])), [bankAccounts]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    sourceFilter !== 'all' ||
    typeFilter !== 'all' ||
    fromDate !== '' ||
    toDate !== '';

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = transactions.filter((tx) => {
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'all_bank') {
          if (tx.type !== 'bank_spend') return false;
        } else if (sourceFilter.startsWith('bank:')) {
          const targetBankId = sourceFilter.slice(5);
          if (tx.bankAccountId !== targetBankId) return false;
        } else {
          if (tx.cardId !== sourceFilter) return false;
        }
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      if (query) {
        const cardName = cardById.get(tx.cardId)?.name.toLowerCase() ?? '';
        const bankName = tx.bankAccountId
          ? bankById.get(tx.bankAccountId)?.name.toLowerCase() ?? ''
          : '';
        const categoryName =
          tx.type === 'spend' || tx.type === 'bank_spend'
            ? getCategoryLabel(resolveTransactionCategory(tx)).toLowerCase()
            : '';
        const typeKeyword =
          tx.type === 'cashback'
            ? 'cashback'
            : tx.type === 'bank_spend'
              ? 'bank upi'
              : tx.type === 'payment'
                ? 'payment bill'
                : 'card spend';
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesCard = cardName.includes(query);
        const matchesBank = bankName.includes(query);
        const matchesCategory = categoryName.includes(query);
        const matchesType = typeKeyword.includes(query);
        if (!matchesDesc && !matchesCard && !matchesBank && !matchesCategory && !matchesType) {
          return false;
        }
      }
      return true;
    });

    return matches.sort((a, b) => {
      const dateCmp =
        sortOrder === 'newest'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return sortOrder === 'newest'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt);
    });
  }, [
    transactions,
    sourceFilter,
    typeFilter,
    fromDate,
    toDate,
    searchQuery,
    sortOrder,
    cardById,
    bankById,
  ]);

  const filteredTotals = useMemo(() => {
    let cardSpend = 0;
    let bankSpend = 0;
    let payment = 0;
    let cashback = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'spend') cardSpend += tx.amount;
      else if (tx.type === 'bank_spend') bankSpend += tx.amount;
      else if (tx.type === 'cashback') cashback += tx.amount;
      else payment += tx.amount;
    }
    return {
      cardSpend: roundMoney(cardSpend),
      bankSpend: roundMoney(bankSpend),
      payment: roundMoney(payment),
      cashback: roundMoney(cashback),
    };
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setTypeFilter('all');
    setFromDate('');
    setToDate('');
  };

  const canAddEntry = cards.length > 0 || bankAccounts.length > 0;

  return (
    <div className="space-y-5">
      {/* Search & Filters Surface */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none w-4 h-4 text-m3-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spends, UPI, cashback or cards"
              aria-label="Search transactions"
              className="w-full h-11 pl-11 pr-4 rounded-full bg-m3-surface-high border border-transparent text-[13px] text-m3-on-surface placeholder:text-m3-on-surface-variant/80 focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            className="h-10 px-4 rounded-full bg-m3-surface-high text-[13px] font-medium text-m3-on-surface inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="w-4 h-4 text-m3-on-surface-variant" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        {/* Type Filter Pills (responsive wrapping, zero clipping on narrow phones) */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter by transaction type"
        >
          {TYPE_FILTER_OPTIONS.map((opt) => {
            const active = typeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeFilter(opt.id)}
                className={`h-9 px-3.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
                  active
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container border-m3-primary/35'
                    : 'bg-m3-surface-low text-m3-on-surface-variant border-m3-outline-variant/60 hover:text-m3-on-surface'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Source & Date Range Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Source Dropdown (Cards + Bank Accounts) */}
          <select
            aria-label="Filter by card or bank account"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 px-4 rounded-full bg-m3-surface-low border border-m3-outline-variant text-[13px] text-m3-on-surface focus:border-m3-primary focus:outline-none"
          >
            <option value="all">All Cards &amp; Banks</option>
            {cards.length > 0 && (
              <optgroup label="Credit Cards">
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </optgroup>
            )}
            {bankAccounts.length > 0 && (
              <optgroup label="Bank / UPI Accounts">
                <option value="all_bank">All Bank / UPI Spends</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={`bank:${acc.id}`}>
                    {acc.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* From Date */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-from-date" className="text-xs text-m3-on-surface-variant shrink-0">
              From
            </label>
            <input
              id="filter-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-full bg-m3-surface-low border border-m3-outline-variant font-mono tabular-nums text-xs text-m3-on-surface focus:border-m3-primary focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-to-date" className="text-xs text-m3-on-surface-variant shrink-0">
              To
            </label>
            <input
              id="filter-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-full bg-m3-surface-low border border-m3-outline-variant font-mono tabular-nums text-xs text-m3-on-surface focus:border-m3-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Inverted date range notice */}
        {fromDate && toDate && fromDate > toDate && (
          <p className="text-xs text-m3-error">
            Start date ({formatShortDate(fromDate)}) is after end date ({formatShortDate(toDate)}).
            Adjust the date range to see matching transactions.
          </p>
        )}

        {/* Filter Totals & Reset */}
        <div className="pt-2 border-t border-m3-outline-variant/50 flex flex-wrap items-center justify-between gap-3 text-xs text-m3-on-surface-variant">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Showing{' '}
              <strong className="font-mono tabular-nums text-m3-on-surface">
                {filteredTransactions.length}
              </strong>{' '}
              of {transactions.length}
            </span>
            <span>
              Card:{' '}
              <strong className="font-mono tabular-nums text-m3-on-surface">
                {formatMoney(filteredTotals.cardSpend, currency)}
              </strong>
            </span>
            {filteredTotals.bankSpend > 0 && (
              <span>
                Bank/UPI:{' '}
                <strong className="font-mono tabular-nums text-m3-on-surface">
                  {formatMoney(filteredTotals.bankSpend, currency)}
                </strong>
              </span>
            )}
            <span>
              Paid:{' '}
              <strong className="font-mono tabular-nums text-m3-success">
                {formatMoney(filteredTotals.payment, currency)}
              </strong>
            </span>
            {filteredTotals.cashback > 0 && (
              <span>
                Cashback:{' '}
                <strong className="font-mono tabular-nums text-m3-success">
                  +{formatMoney(filteredTotals.cashback, currency)}
                </strong>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-m3-primary hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Transactions List */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-m3-on-surface">
              {transactions.length === 0
                ? 'No transactions recorded yet'
                : 'No matching transactions found'}
            </p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              {transactions.length === 0
                ? 'Add card spending, direct bank/UPI spending, cashback, or bill payments to build your ledger.'
                : 'Try adjusting your search query, filter, or date range.'}
            </p>
            {transactions.length === 0 && canAddEntry && (
              <button
                type="button"
                onClick={() =>
                  onOpenTransactionModal({type: cards.length > 0 ? 'spend' : 'bank_spend'})
                }
                className="mt-5 h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-m3-outline-variant/50">
            {filteredTransactions.map((tx) => {
              const card = cardById.get(tx.cardId);
              const bankAcc = tx.bankAccountId
                ? bankById.get(tx.bankAccountId)
                : bankAccounts[0];
              const isPayment = tx.type === 'payment';
              const isBankSpend = tx.type === 'bank_spend';
              const isCashback = tx.type === 'cashback';

              let cycleLabel = '';
              if (tx.type === 'spend' && card) {
                const win = getCycleWindowForTransactionDate(
                  tx.date,
                  card.billingDay,
                  card.dueDay
                );
                cycleLabel = win.statementDate <= todayDate ? 'Billed' : 'Current Cycle';
              }

              const iconBgClass =
                isPayment || isCashback
                  ? 'bg-m3-success-container text-m3-on-success-container'
                  : isBankSpend
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                    : 'bg-m3-surface-container text-m3-on-surface-variant';

              const amountColorClass =
                isPayment || isCashback ? 'text-m3-success' : 'text-m3-on-surface';

              const amountPrefix = isPayment || isBankSpend ? '−' : '+';

              const subtitle = isBankSpend
                ? `${bankAcc?.name ?? 'Bank'} · ${formatShortDate(tx.date)} · ${getCategoryLabel(
                    resolveTransactionCategory(tx)
                  )}${tx.deductFromBank === false ? ' · Not deducted' : ' · Bank / UPI'}`
                : isCashback
                  ? `${card?.name ?? 'Card'} · ${formatShortDate(tx.date)} · ${
                      tx.cashbackDestination === 'bank'
                        ? `Cashback → ${bankAcc?.name ?? 'Bank'}`
                        : 'Cashback · Card bill'
                    }`
                  : isPayment
                    ? `${card?.name ?? 'Card'} · ${formatShortDate(tx.date)}${
                        tx.deductFromBank
                          ? bankAcc
                            ? ` · Paid via ${bankAcc.name}`
                            : ' · Payment (Bank deducted)'
                          : ' · Payment'
                      }`
                    : `${card?.name ?? 'Card'} · ${formatShortDate(tx.date)} · ${getCategoryLabel(
                        resolveTransactionCategory(tx)
                      )}${cycleLabel ? ` · ${cycleLabel}` : ''}`;

              return (
                <div
                  key={tx.id}
                  className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-m3-surface-low/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBgClass}`}
                    >
                      {isPayment ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isCashback ? (
                        <Sparkles className="w-4 h-4" />
                      ) : isBankSpend ? (
                        <Landmark className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-m3-on-surface truncate">
                        {tx.description}
                      </p>
                      <p className="mt-0.5 text-xs text-m3-on-surface-variant truncate">
                        {subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-semibold font-mono tabular-nums mr-1 ${amountColorClass}`}
                    >
                      {amountPrefix}
                      {formatMoney(tx.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      aria-label={`Edit ${tx.description}`}
                      className="min-h-[42px] min-w-[42px] rounded-full text-m3-on-surface-variant hover:bg-m3-surface-high flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx)}
                      aria-label={`Delete ${tx.description}`}
                      className="min-h-[42px] min-w-[42px] rounded-full text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
