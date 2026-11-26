import type {SpendingCategory, Transaction} from '../types/finance';

export interface CategoryMeta {
  id: SpendingCategory;
  label: string;
  shortLabel: string;
  color: string;
  darkColor: string;
  badgeClass: string;
}

export const SPENDING_CATEGORIES: CategoryMeta[] = [
  {
    id: 'food',
    label: 'Food & Dining',
    shortLabel: 'Food',
    color: '#0B57D0',
    darkColor: '#A8C7FA',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    shortLabel: 'Shopping',
    color: '#7C3AED',
    darkColor: '#C4B5FD',
    badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  },
  {
    id: 'bills',
    label: 'Bills & Utilities',
    shortLabel: 'Bills',
    color: '#0D9488',
    darkColor: '#5EEAD4',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  {
    id: 'travel',
    label: 'Travel & Transit',
    shortLabel: 'Travel',
    color: '#D97706',
    darkColor: '#FCD34D',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'fuel',
    label: 'Fuel & Auto',
    shortLabel: 'Fuel',
    color: '#EA580C',
    darkColor: '#FDBA74',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    shortLabel: 'Health',
    color: '#16A34A',
    darkColor: '#86EFAC',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    shortLabel: 'Fun',
    color: '#DB2777',
    darkColor: '#F9A8D4',
    badgeClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    color: '#64748B',
    darkColor: '#94A3B8',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  },
];

export const VALID_SPENDING_CATEGORIES: SpendingCategory[] = SPENDING_CATEGORIES.map((c) => c.id);

export const CATEGORY_BY_ID: Record<SpendingCategory, CategoryMeta> = SPENDING_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SpendingCategory, CategoryMeta>
);

const CATEGORY_KEYWORDS: Array<{category: SpendingCategory; keywords: string[]}> = [
  {
    category: 'food',
    keywords: [
      'grocery',
      'groceries',
      'supermarket',
      'food',
      'dining',
      'restaurant',
      'cafe',
      'coffee',
      'bakery',
      'swiggy',
      'zomato',
      'blinkit',
      'zepto',
      'instamart',
      'produce',
      'lunch',
      'dinner',
      'breakfast',
      'pizza',
      'burger',
      'tea',
      'snacks',
      'dairy',
      'milk',
      'market',
    ],
  },
  {
    category: 'fuel',
    keywords: [
      'fuel',
      'petrol',
      'diesel',
      'gas station',
      'hpcl',
      'bpcl',
      'iocl',
      'shell',
      'parking',
      'toll',
      'fastag',
      'service center',
      'car wash',
      'tyre',
      'auto',
    ],
  },
  {
    category: 'travel',
    keywords: [
      'flight',
      'airline',
      'indigo',
      'air india',
      'hotel',
      'airbnb',
      'metro',
      'train',
      'irctc',
      'uber',
      'ola',
      'rapido',
      'cab',
      'taxi',
      'bus',
      'commute',
      'travel',
      'trip',
      'booking',
      'ticket',
    ],
  },
  {
    category: 'bills',
    keywords: [
      'electricity',
      'broadband',
      'fiber',
      'wifi',
      'internet',
      'recharge',
      'mobile',
      'postpaid',
      'water',
      'gas bill',
      'utility',
      'utilities',
      'insurance',
      'rent',
      'cloud',
      'storage',
      'subscription',
      'software',
      'domain',
      'hosting',
      'bill',
    ],
  },
  {
    category: 'health',
    keywords: [
      'pharmacy',
      'medicine',
      'medical',
      'hospital',
      'doctor',
      'clinic',
      'lab',
      'dental',
      'wellness',
      'health',
      'gym',
      'fitness',
      'apollo',
      '1mg',
      'pharmeasy',
    ],
  },
  {
    category: 'entertainment',
    keywords: [
      'movie',
      'cinema',
      'pvr',
      'inox',
      'netflix',
      'spotify',
      'prime video',
      'hotstar',
      'youtube',
      'game',
      'gaming',
      'steam',
      'playstation',
      'concert',
      'event',
      'bookmyshow',
    ],
  },
  {
    category: 'shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'nykaa',
      'shopping',
      'mall',
      'clothes',
      'apparel',
      'shoes',
      'electronics',
      'headphones',
      'phone',
      'laptop',
      'accessories',
      'desk',
      'furniture',
      'home',
      'ikea',
      'gift',
      'order',
    ],
  },
];

export function inferSpendingCategory(description: string): SpendingCategory {
  const normalized = description.trim().toLowerCase();
  if (!normalized) return 'other';

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.category;
    }
  }
  return 'other';
}

export function resolveTransactionCategory(tx: Pick<Transaction, 'category' | 'description'>): SpendingCategory {
  if (tx.category && VALID_SPENDING_CATEGORIES.includes(tx.category)) {
    return tx.category;
  }
  return inferSpendingCategory(tx.description);
}

export function getCategoryLabel(category: SpendingCategory): string {
  return CATEGORY_BY_ID[category]?.label ?? 'Other';
}
