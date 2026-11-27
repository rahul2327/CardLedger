import type {CardColorToken, CurrencyCode, PaymentStatus} from '../types/finance';
import {parseDateParts} from './financeEngine';

const CURRENCY_CONFIG: Record<CurrencyCode, {locale: string; symbol: string; label: string}> = {
  INR: {locale: 'en-IN', symbol: '₹', label: 'Indian Rupee (₹)'},
  USD: {locale: 'en-US', symbol: '$', label: 'US Dollar ($)'},
  EUR: {locale: 'de-DE', symbol: '€', label: 'Euro (€)'},
  GBP: {locale: 'en-GB', symbol: '£', label: 'British Pound (£)'},
};

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_CONFIG).map(([code, meta]) => ({
  code: code as CurrencyCode,
  ...meta,
}));

export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_CONFIG[currency]?.symbol ?? '₹';
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'INR',
  options?: {compact?: boolean; showSign?: boolean}
): string {
  const cfg = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR;
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const hasDecimals = Math.abs(abs - Math.round(abs)) > 0.001;

  const formatted = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
    notation: options?.compact && abs >= 100000 ? 'compact' : 'standard',
  }).format(abs);

  if (isNegative) return `−${formatted}`;
  if (options?.showSign && amount > 0) return `+${formatted}`;
  return formatted;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatShortDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const {year, month, day} = parseDateParts(dateStr);
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatDayMonth(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const {month, day} = parseDateParts(dateStr);
  return `${day} ${SHORT_MONTHS[month - 1]}`;
}

export function formatHeaderDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const {year, month, day} = parseDateParts(dateStr);
  const dt = new Date(year, month - 1, day);
  return `${WEEKDAYS[dt.getDay()]}, ${day} ${SHORT_MONTHS[month - 1]}`;
}

export function formatOrdinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatDueCountdown(daysUntilDue: number): string {
  if (daysUntilDue < -1) return `Overdue by ${Math.abs(daysUntilDue)} days`;
  if (daysUntilDue === -1) return 'Overdue by 1 day';
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

export function formatPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'overdue':
      return 'Overdue';
    case 'unpaid':
      return 'Unpaid';
    case 'no_bill':
      return 'No Bill';
  }
}

export const CARD_COLOR_TOKENS: Record<
  CardColorToken,
  {
    label: string;
    swatch: string;
    accentText: string;
    softBg: string;
  }
> = {
  teal: {
    label: 'Eucalyptus',
    swatch: 'bg-[#196A5E] dark:bg-[#70C4B4]',
    accentText: 'text-[#196A5E] dark:text-[#82D5C5]',
    softBg: 'bg-[#D6EFE9] dark:bg-[#163833]',
  },
  indigo: {
    label: 'Slate Blue',
    swatch: 'bg-[#3D5A80] dark:bg-[#93B4DC]',
    accentText: 'text-[#345074] dark:text-[#9EC0E8]',
    softBg: 'bg-[#DCE6F2] dark:bg-[#1E2E42]',
  },
  emerald: {
    label: 'Sage Green',
    swatch: 'bg-[#2D6A4F] dark:bg-[#82C9A6]',
    accentText: 'text-[#245A42] dark:text-[#8CD4B1]',
    softBg: 'bg-[#D7EDE2] dark:bg-[#193729]',
  },
  amber: {
    label: 'Warm Ochre',
    swatch: 'bg-[#9C6615] dark:bg-[#E2B56D]',
    accentText: 'text-[#87560C] dark:text-[#E7BF78]',
    softBg: 'bg-[#F3E5CE] dark:bg-[#3C2D14]',
  },
  rose: {
    label: 'Muted Clay',
    swatch: 'bg-[#94475B] dark:bg-[#E09CAE]',
    accentText: 'text-[#83394D] dark:text-[#E5A7B7]',
    softBg: 'bg-[#F2DFE4] dark:bg-[#3B1F27]',
  },
  slate: {
    label: 'Graphite',
    swatch: 'bg-[#4A5759] dark:bg-[#A6B6B8]',
    accentText: 'text-[#3E4B4D] dark:text-[#B4C4C6]',
    softBg: 'bg-[#E1E7E8] dark:bg-[#252E30]',
  },
};
