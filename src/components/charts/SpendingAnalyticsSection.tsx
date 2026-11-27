import React, {useMemo, useState} from 'react';
import {BarChart3, PieChart} from 'lucide-react';
import type {
  BankAccount,
  CreditCard,
  CurrencyCode,
  SpendingCategory,
  ThemeMode,
  Transaction,
} from '../../types/finance';
import {
  CATEGORY_BY_ID,
  resolveTransactionCategory,
} from '../../utils/categories';
import {parseDateParts, roundMoney, shiftYearMonth} from '../../utils/financeEngine';
import {CARD_COLOR_TOKENS, formatMoney} from '../../utils/formatters';

interface SpendingAnalyticsSectionProps {
  cards: CreditCard[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  currency: CurrencyCode;
  theme: ThemeMode;
  todayDate: string;
}

type TimeRange = 'this_month' | '3m' | '6m' | 'all';

const TIME_RANGE_OPTIONS: Array<{id: TimeRange; label: string}> = [
  {id: 'this_month', label: 'This Month'},
  {id: '3m', label: '3M'},
  {id: '6m', label: '6M'},
  {id: 'all', label: 'All'},
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthKey(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function getMonthShortLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return SHORT_MONTHS[(m || 1) - 1] ?? '';
}

function getMonthFullLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${SHORT_MONTHS[(m || 1) - 1] ?? ''} ${y}`;
}

export const SpendingAnalyticsSection: React.FC<SpendingAnalyticsSectionProps> = ({
  cards,
  bankAccounts,
  transactions,
  currency,
  theme,
  todayDate,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const todayParts = useMemo(() => parseDateParts(todayDate), [todayDate]);

  // Filter transactions by chosen timeframe for Category & Source breakdowns
  const rangeStartMonthKey = useMemo(() => {
    if (timeRange === 'all') return null;
    const offset = timeRange === 'this_month' ? 0 : timeRange === '3m' ? -2 : -5;
    const start = shiftYearMonth(todayParts.year, todayParts.month, offset);
    return getMonthKey(start.year, start.month);
  }, [timeRange, todayParts.year, todayParts.month]);

  const filteredSpends = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type !== 'spend' && tx.type !== 'bank_spend') return false;
      if (rangeStartMonthKey && tx.date.slice(0, 7) < rangeStartMonthKey) return false;
      return true;
    });
  }, [transactions, rangeStartMonthKey]);

  const spendSplit = useMemo(() => {
    let cardTotal = 0;
    let bankTotal = 0;
    for (const tx of filteredSpends) {
      if (tx.type === 'bank_spend') bankTotal += tx.amount;
      else cardTotal += tx.amount;
    }
    return {
      cardTotal: roundMoney(cardTotal),
      bankTotal: roundMoney(bankTotal),
    };
  }, [filteredSpends]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<SpendingCategory, {amount: number; count: number}>();
    let total = 0;

    for (const tx of filteredSpends) {
      const cat = resolveTransactionCategory(tx);
      const current = map.get(cat) ?? {amount: 0, count: 0};
      current.amount = roundMoney(current.amount + tx.amount);
      current.count += 1;
      map.set(cat, current);
      total = roundMoney(total + tx.amount);
    }

    const items = Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        meta: CATEGORY_BY_ID[category],
        amount: stats.amount,
        count: stats.count,
        percent: total > 0 ? Math.round((stats.amount / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {total, items};
  }, [filteredSpends]);

  // Build 3- or 6-month Total Spend vs CC Paid trend bars (+ monthly cashback readout)
  const monthlySeries = useMemo(() => {
    const monthCount = timeRange === '3m' ? 3 : 6;
    const buckets: Array<{
      monthKey: string;
      label: string;
      spend: number;
      payment: number;
      cashback: number;
    }> = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const ym = shiftYearMonth(todayParts.year, todayParts.month, -i);
      const key = getMonthKey(ym.year, ym.month);
      buckets.push({
        monthKey: key,
        label: getMonthShortLabel(key),
        spend: 0,
        payment: 0,
        cashback: 0,
      });
    }

    const bucketMap = new Map(buckets.map((b) => [b.monthKey, b]));
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      if (tx.type === 'spend' || tx.type === 'bank_spend') {
        bucket.spend = roundMoney(bucket.spend + tx.amount);
      } else if (tx.type === 'payment') {
        bucket.payment = roundMoney(bucket.payment + tx.amount);
      } else if (tx.type === 'cashback') {
        bucket.cashback = roundMoney(bucket.cashback + tx.amount);
      }
    }

    const maxValue = Math.max(
      1,
      ...buckets.map((b) => Math.max(b.spend, b.payment))
    );

    return {buckets, maxValue};
  }, [transactions, timeRange, todayParts.year, todayParts.month]);

  // Spending by source (Credit Cards + Bank/UPI Accounts)
  const sourceBreakdown = useMemo(() => {
    const totals = new Map<
      string,
      {id: string; name: string; kind: 'card' | 'bank'; swatchClass: string; amount: number}
    >();
    let grandTotal = 0;

    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const bankMap = new Map(bankAccounts.map((b) => [b.id, b]));

    for (const tx of filteredSpends) {
      grandTotal = roundMoney(grandTotal + tx.amount);

      if (tx.type === 'bank_spend') {
        const bank = tx.bankAccountId ? bankMap.get(tx.bankAccountId) : bankAccounts[0];
        const key = bank ? `bank:${bank.id}` : 'bank:other';
        const existing = totals.get(key) ?? {
          id: key,
          name: bank ? `${bank.name} (UPI/Bank)` : 'Bank / UPI',
          kind: 'bank' as const,
          swatchClass: 'bg-sky-500',
          amount: 0,
        };
        existing.amount = roundMoney(existing.amount + tx.amount);
        totals.set(key, existing);
      } else {
        const card = cardMap.get(tx.cardId);
        const key = `card:${tx.cardId}`;
        const tone = card ? CARD_COLOR_TOKENS[card.colorToken] : CARD_COLOR_TOKENS.teal;
        const existing = totals.get(key) ?? {
          id: key,
          name: card?.name ?? 'Credit Card',
          kind: 'card' as const,
          swatchClass: tone.swatch,
          amount: 0,
        };
        existing.amount = roundMoney(existing.amount + tx.amount);
        totals.set(key, existing);
      }
    }

    if (grandTotal <= 0) return [];
    const list = Array.from(totals.values())
      .filter((item) => item.amount > 0)
      .map((item) => ({
        ...item,
        percent: Math.round((item.amount / grandTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.amount - a.amount);

    return list.length >= 2 ? list : [];
  }, [cards, bankAccounts, filteredSpends]);

  // Active donut focus
  const activeCategoryItem = useMemo(() => {
    if (!selectedCategory) return null;
    return categoryBreakdown.items.find((i) => i.category === selectedCategory) ?? null;
  }, [selectedCategory, categoryBreakdown.items]);

  // Active month bar focus (defaults to latest non-zero month or current month)
  const activeMonthBucket = useMemo(() => {
    if (selectedMonthKey) {
      const found = monthlySeries.buckets.find((b) => b.monthKey === selectedMonthKey);
      if (found) return found;
    }
    const latestWithData = [...monthlySeries.buckets]
      .reverse()
      .find((b) => b.spend > 0 || b.payment > 0 || b.cashback > 0);
    return latestWithData ?? monthlySeries.buckets[monthlySeries.buckets.length - 1];
  }, [selectedMonthKey, monthlySeries.buckets]);

  // Donut geometry
  const donutSize = 152;
  const strokeWidth = 22;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    let offset = 0;
    return categoryBreakdown.items.map((item) => {
      const fraction = categoryBreakdown.total > 0 ? item.amount / categoryBreakdown.total : 0;
      const rawLength = fraction * circumference;
      const gap = categoryBreakdown.items.length > 1 ? 3 : 0;
      const length = Math.max(0, rawLength - gap);
      const seg = {
        ...item,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      };
      offset += rawLength;
      return seg;
    });
  }, [categoryBreakdown, circumference]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <section aria-label="Spending analytics and charts" className="space-y-4">
      {/* Section Header + Compact Time Range Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-m3-on-surface">Spending Insights</h2>
          <p className="text-xs text-m3-on-surface-variant">
            Category breakdown across cards &amp; bank UPI
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-full bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50"
          role="tablist"
          aria-label="Chart timeframe"
        >
          {TIME_RANGE_OPTIONS.map((opt) => {
            const active = timeRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTimeRange(opt.id);
                  setSelectedCategory(null);
                }}
                className={`h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                    : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Spending by Category Donut + Bars */}
        <div className="lg:col-span-7 rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-m3-on-surface">Spending by Category</h3>
              <p className="text-xs text-m3-on-surface-variant">
                {filteredSpends.length}{' '}
                {filteredSpends.length === 1 ? 'expense' : 'expenses'}
                {spendSplit.bankTotal > 0 && spendSplit.cardTotal > 0 ? (
                  <>
                    {' '}
                    · Cards{' '}
                    <span className="font-mono tabular-nums">
                      {formatMoney(spendSplit.cardTotal, currency)}
                    </span>{' '}
                    · Bank/UPI{' '}
                    <span className="font-mono tabular-nums">
                      {formatMoney(spendSplit.bankTotal, currency)}
                    </span>
                  </>
                ) : (
                  ' · Tap a category to focus'
                )}
              </p>
            </div>
            <PieChart className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
          </div>

          {categoryBreakdown.items.length === 0 ? (
            <div className="py-8 text-center text-xs text-m3-on-surface-variant">
              No spending recorded in this period.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Interactive SVG Donut Chart */}
              <div className="relative shrink-0" style={{width: donutSize, height: donutSize}}>
                <svg
                  width={donutSize}
                  height={donutSize}
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="-rotate-90"
                  role="img"
                  aria-label="Spending distribution by category"
                >
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-m3-surface-high"
                    strokeWidth={strokeWidth}
                  />
                  {donutSegments.map((seg) => {
                    const isFocused =
                      !selectedCategory || selectedCategory === seg.category;
                    const strokeColor = isDark ? seg.meta.darkColor : seg.meta.color;
                    return (
                      <circle
                        key={seg.category}
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={
                          selectedCategory === seg.category ? strokeWidth + 3 : strokeWidth
                        }
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        strokeLinecap="butt"
                        opacity={isFocused ? 1 : 0.28}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() =>
                          setSelectedCategory((prev) =>
                            prev === seg.category ? null : seg.category
                          )
                        }
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Callout */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-[10px] font-medium text-m3-on-surface-variant truncate max-w-full">
                    {activeCategoryItem ? activeCategoryItem.meta.shortLabel : 'Total Spend'}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-m3-on-surface truncate max-w-full">
                    {formatMoney(
                      activeCategoryItem
                        ? activeCategoryItem.amount
                        : categoryBreakdown.total,
                      currency
                    )}
                  </span>
                  {activeCategoryItem && (
                    <span className="text-[10px] font-mono tabular-nums text-m3-primary font-medium">
                      {activeCategoryItem.percent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Ranked Category Progress List */}
              <div className="flex-1 w-full min-w-0 space-y-2.5">
                {categoryBreakdown.items.map((item) => {
                  const active = selectedCategory === item.category;
                  const barColor = isDark ? item.meta.darkColor : item.meta.color;
                  return (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() =>
                        setSelectedCategory((prev) =>
                          prev === item.category ? null : item.category
                        )
                      }
                      className={`w-full text-left rounded-2xl px-2.5 py-2 transition-colors ${
                        active ? 'bg-m3-surface-high/90' : 'hover:bg-m3-surface-low/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{backgroundColor: barColor}}
                          />
                          <span className="font-medium text-m3-on-surface truncate">
                            {item.meta.label}
                          </span>
                          <span className="text-[11px] text-m3-on-surface-variant shrink-0">
                            ({item.count})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono tabular-nums text-m3-on-surface-variant">
                            {item.percent}%
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-m3-on-surface">
                            {formatMoney(item.amount, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-m3-surface-high overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(4, item.percent)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Monthly Spending vs. Payments Graph (+ Spending by Source) */}
        <div className="lg:col-span-5 rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/50 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-m3-on-surface">
                  Monthly Spend vs. Paid
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  Tap any month to inspect totals
                </p>
              </div>
              <BarChart3 className="w-4 h-4 text-m3-primary shrink-0" />
            </div>

            {/* Selected Month Readout Strip */}
            {activeMonthBucket && (
              <div className="rounded-2xl bg-m3-surface-low border border-m3-outline-variant/50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-m3-on-surface">
                  {getMonthFullLabel(activeMonthBucket.monthKey)}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-m3-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-m3-primary" />
                    <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                      {formatMoney(activeMonthBucket.spend, currency)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-m3-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-m3-success" />
                    <span className="font-mono tabular-nums font-medium text-m3-success">
                      {formatMoney(activeMonthBucket.payment, currency)}
                    </span>
                  </span>
                  {activeMonthBucket.cashback > 0 && (
                    <span className="font-mono tabular-nums font-medium text-m3-success">
                      +{formatMoney(activeMonthBucket.cashback, currency)} CB
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Responsive Grouped Bar Graph */}
            <div className="pt-2">
              <div
                className="grid items-end gap-2 h-36 px-1"
                style={{
                  gridTemplateColumns: `repeat(${monthlySeries.buckets.length}, minmax(0, 1fr))`,
                }}
              >
                {monthlySeries.buckets.map((bucket) => {
                  const isActive = activeMonthBucket?.monthKey === bucket.monthKey;
                  const spendPct =
                    bucket.spend > 0
                      ? Math.max(8, Math.round((bucket.spend / monthlySeries.maxValue) * 100))
                      : 0;
                  const payPct =
                    bucket.payment > 0
                      ? Math.max(8, Math.round((bucket.payment / monthlySeries.maxValue) * 100))
                      : 0;

                  return (
                    <button
                      key={bucket.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(bucket.monthKey)}
                      aria-label={`${getMonthFullLabel(bucket.monthKey)}: Spent ${formatMoney(
                        bucket.spend,
                        currency
                      )}, Paid ${formatMoney(bucket.payment, currency)}`}
                      className={`h-full flex flex-col items-center justify-end gap-1.5 rounded-2xl py-1.5 px-1 transition-colors ${
                        isActive ? 'bg-m3-surface-high/70' : 'hover:bg-m3-surface-low/70'
                      }`}
                    >
                      <div className="w-full flex-1 flex items-end justify-center gap-1">
                        <div
                          className={`w-3 sm:w-3.5 rounded-t-md transition-all duration-300 ${
                            bucket.spend > 0
                              ? 'bg-m3-primary'
                              : 'bg-m3-outline-variant/30 h-[3px]'
                          }`}
                          style={bucket.spend > 0 ? {height: `${spendPct}%`} : undefined}
                        />
                        <div
                          className={`w-3 sm:w-3.5 rounded-t-md transition-all duration-300 ${
                            bucket.payment > 0
                              ? 'bg-m3-success'
                              : 'bg-m3-outline-variant/30 h-[3px]'
                          }`}
                          style={bucket.payment > 0 ? {height: `${payPct}%`} : undefined}
                        />
                      </div>
                      <span
                        className={`text-[11px] leading-none ${
                          isActive
                            ? 'font-semibold text-m3-on-surface'
                            : 'font-medium text-m3-on-surface-variant'
                        }`}
                      >
                        {bucket.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-2.5 flex items-center justify-center gap-5 text-[11px] text-m3-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-m3-primary" />
                  <span>Total Spend</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-m3-success" />
                  <span>CC Paid</span>
                </span>
              </div>
            </div>
          </div>

          {/* Per-Source Spending Breakdown (Credit Cards + Bank/UPI Accounts) */}
          {sourceBreakdown.length > 0 && (
            <div className="pt-3.5 border-t border-m3-outline-variant/50 space-y-2">
              <p className="text-xs font-medium text-m3-on-surface-variant">Spending by Source</p>
              <div className="space-y-2">
                {sourceBreakdown.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-m3-on-surface truncate">
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums text-m3-on-surface-variant shrink-0">
                        {formatMoney(item.amount, currency)} ({item.percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-m3-surface-high overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.swatchClass} transition-all duration-300`}
                        style={{width: `${Math.max(4, item.percent)}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
