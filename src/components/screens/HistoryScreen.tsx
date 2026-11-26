import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
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

type TypeFilter = 'all' | 'spend' | 'payment';
type SortOrder = 'newest' | 'oldest';

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
  const [cardFilter, setCardFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const bankById = useMemo(() => new Map(bankAccounts.map((b) => [b.id, b])), [bankAccounts]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    cardFilter !== 'all' ||
    typeFilter !== 'all' ||
    fromDate !== '' ||
    toDate !== '';

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = transactions.filter((tx) => {
      if (cardFilter !== 'all' && tx.cardId !== cardFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      if (query) {
        const cardName = cardById.get(tx.cardId)?.name.toLowerCase() ?? '';
        const bankName = tx.bankAccountId
          ? bankById.get(tx.bankAccountId)?.name.toLowerCase() ?? ''
          : '';
        const categoryName =
          tx.type === 'spend'
            ? getCategoryLabel(resolveTransactionCategory(tx)).toLowerCase()
            : '';
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesCard = cardName.includes(query);
        const matchesBank = bankName.includes(query);
        const matchesCategory = categoryName.includes(query);
        if (!matchesDesc && !matchesCard && !matchesBank && !matchesCategory) return false;
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
  }, [transactions, cardFilter, typeFilter, fromDate, toDate, searchQuery, sortOrder, cardById, bankById]);

  const filteredTotals = useMemo(() => {
    let spend = 0;
    let payment = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'spend') spend += tx.amount;
      else payment += tx.amount;
    }
    return {
      spend: roundMoney(spend),
      payment: roundMoney(payment),
    };
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearchQuery('');
    setCardFilter('all');
    setTypeFilter('all');
    setFromDate('');
    setToDate('');
  };

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
              placeholder="Search transactions or cards"
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

        {/* Second Row: Type, Card, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Type Filter */}
          <div
            className="grid grid-cols-3 p-1 rounded-full bg-m3-surface-low border border-m3-outline-variant/60"
            role="tablist"
            aria-label="Filter by transaction type"
          >
            {(['all', 'spend', 'payment'] as TypeFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={typeFilter === key}
                onClick={() => setTypeFilter(key)}
                className={`h-9 px-2 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap truncate ${
                  typeFilter === key
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                    : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                }`}
              >
                {key === 'all' ? 'All' : key === 'spend' ? 'Spend' : 'Paid'}
              </button>
            ))}
          </div>

          {/* Card Dropdown */}
          <select
            aria-label="Filter by credit card"
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            className="h-10 px-4 rounded-full bg-m3-surface-low border border-m3-outline-variant text-[13px] text-m3-on-surface focus:border-m3-primary focus:outline-none"
          >
            <option value="all">All Cards</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
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
              className="w-full min-h-[44px] px-3 rounded-full bg-m3-surface-low border border-m3-outline-variant font-mono tabular-nums text-xs text-m3-on-surface focus:border-m3-primary focus:outline-none"
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
              className="w-full min-h-[44px] px-3 rounded-full bg-m3-surface-low border border-m3-outline-variant font-mono tabular-nums text-xs text-m3-on-surface focus:border-m3-primary focus:outline-none"
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
              Spent:{' '}
              <strong className="font-mono tabular-nums text-m3-on-surface">
                {formatMoney(filteredTotals.spend, currency)}
              </strong>
            </span>
            <span>
              Paid:{' '}
              <strong className="font-mono tabular-nums text-m3-success">
                {formatMoney(filteredTotals.payment, currency)}
              </strong>
            </span>
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
                ? 'Add a spending entry or card payment to build your local ledger.'
                : 'Try adjusting your search query, card filter, or date range.'}
            </p>
            {transactions.length === 0 && cards.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenTransactionModal({type: 'spend'})}
                className="mt-5 h-10 px-4 rounded-full bg-m3-primary-container text-m3-on-primary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Add Spending</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-m3-outline-variant/50">
            {filteredTransactions.map((tx) => {
              const card = cardById.get(tx.cardId);
              const isPayment = tx.type === 'payment';
              let cycleLabel = '';
              if (!isPayment && card) {
                const win = getCycleWindowForTransactionDate(
                  tx.date,
                  card.billingDay,
                  card.dueDay
                );
                cycleLabel = win.statementDate <= todayDate ? 'Billed' : 'Current Cycle';
              }

              return (
                <div
                  key={tx.id}
                  className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-m3-surface-low/60 transition-colors"
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
                      <p className="mt-0.5 text-xs text-m3-on-surface-variant truncate">
                        {card?.name ?? 'Card'} · {formatShortDate(tx.date)}
                        {isPayment
                          ? tx.deductFromBank
                            ? tx.bankAccountId && bankById.get(tx.bankAccountId)
                              ? ` · Paid via ${bankById.get(tx.bankAccountId)!.name}`
                              : ' · Payment (Bank deducted)'
                            : ' · Payment'
                          : ` · ${getCategoryLabel(resolveTransactionCategory(tx))}${
                              cycleLabel ? ` · ${cycleLabel}` : ''
                            }`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-semibold font-mono tabular-nums mr-1 ${
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
