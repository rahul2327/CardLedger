import type {
  AppSettings,
  BackupPayload,
  BankAccount,
  CardColorToken,
  CreditCard,
  CurrencyCode,
  SpendingCategory,
  ThemeMode,
  Transaction,
} from '../types/finance';
import {setCachedBiometricLock} from '../utils/biometricAuth';
import {VALID_SPENDING_CATEGORIES} from '../utils/categories';
import {isValidCalendarDate, roundMoney} from '../utils/financeEngine';

const DB_NAME = 'cardledger_offline_db';
const DB_VERSION = 1;

const STORE_SETTINGS = 'settings';
const STORE_CARDS = 'cards';
const STORE_TRANSACTIONS = 'transactions';

const THEME_STORAGE_KEY = 'cardledger_theme';

const VALID_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP'];
const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const VALID_COLORS: CardColorToken[] = ['teal', 'indigo', 'emerald', 'amber', 'rose', 'slate'];
const MAX_AMOUNT = 999_999_999.99;

export function buildBankSummaryFields(
  bankAccounts: BankAccount[],
  fallbackUpdatedAt?: string
): {
  bankBalance: number;
  bankName: string;
  bankUpdatedAt: string;
  bankAccounts: BankAccount[];
} {
  const nowIso = fallbackUpdatedAt || new Date().toISOString();
  const normalizedAccounts = bankAccounts.map((acc) => ({
    id: acc.id,
    name: acc.name.trim().slice(0, 60) || 'Bank Account',
    balance: roundMoney(acc.balance),
    updatedAt: typeof acc.updatedAt === 'string' && acc.updatedAt ? acc.updatedAt : nowIso,
  }));

  const bankBalance = roundMoney(
    normalizedAccounts.reduce((acc, item) => acc + item.balance, 0)
  );
  const bankName =
    normalizedAccounts.length === 0
      ? 'No Bank Accounts'
      : normalizedAccounts.length === 1
        ? normalizedAccounts[0].name
        : `${normalizedAccounts.length} Bank Accounts`;

  return {
    bankBalance,
    bankName,
    bankUpdatedAt: nowIso,
    bankAccounts: normalizedAccounts,
  };
}

export function createDefaultSettings(): AppSettings {
  const nowIso = new Date().toISOString();
  const primaryAccount: BankAccount = {
    id: 'bank-primary',
    name: 'Primary Bank Account',
    balance: 0,
    updatedAt: nowIso,
  };
  return {
    id: 'app-settings',
    ...buildBankSummaryFields([primaryAccount], nowIso),
    currency: 'INR',
    theme: 'dark',
    biometricLockEnabled: false,
  };
}

export const DEFAULT_SETTINGS: AppSettings = createDefaultSettings();

export function normalizeStoredSettings(raw?: Partial<AppSettings> | null): AppSettings {
  const nowIso = new Date().toISOString();
  if (!raw) {
    return createDefaultSettings();
  }

  const currency = VALID_CURRENCIES.includes(raw.currency as CurrencyCode)
    ? (raw.currency as CurrencyCode)
    : DEFAULT_SETTINGS.currency;
  const theme = VALID_THEMES.includes(raw.theme as ThemeMode)
    ? (raw.theme as ThemeMode)
    : DEFAULT_SETTINGS.theme;
  const updatedAt =
    typeof raw.bankUpdatedAt === 'string' && raw.bankUpdatedAt ? raw.bankUpdatedAt : nowIso;

  let bankAccounts: BankAccount[];
  if (Array.isArray(raw.bankAccounts)) {
    const seen = new Set<string>();
    bankAccounts = [];
    for (let i = 0; i < raw.bankAccounts.length; i++) {
      const item = raw.bankAccounts[i];
      if (!item || typeof item !== 'object') continue;
      const id =
        typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `bank-${i + 1}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const balance = Number(item.balance);
      bankAccounts.push({
        id,
        name:
          typeof item.name === 'string' && item.name.trim()
            ? item.name.trim().slice(0, 60)
            : `Bank Account ${i + 1}`,
        balance: Number.isFinite(balance) ? roundMoney(balance) : 0,
        updatedAt:
          typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : updatedAt,
      });
    }
  } else {
    // Seamless backwards-compatible migration from legacy single-bank storage
    const legacyBalance = Number(raw.bankBalance);
    const legacyName =
      typeof raw.bankName === 'string' && raw.bankName.trim()
        ? raw.bankName.trim().slice(0, 60)
        : 'Primary Bank Account';
    bankAccounts = [
      {
        id: 'bank-primary',
        name: legacyName,
        balance: Number.isFinite(legacyBalance) ? roundMoney(legacyBalance) : 0,
        updatedAt,
      },
    ];
  }

  return {
    id: 'app-settings',
    ...buildBankSummaryFields(bankAccounts, updatedAt),
    currency,
    theme,
    biometricLockEnabled: Boolean(raw.biometricLockEnabled),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        db.createObjectStore(STORE_CARDS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORE_TRANSACTIONS, {keyPath: 'id'});
        txStore.createIndex('cardId', 'cardId', {unique: false});
        txStore.createIndex('date', 'date', {unique: false});
        txStore.createIndex('type', 'type', {unique: false});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open local database.'));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Database operation failed.'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Database transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Database transaction aborted.'));
  });
}

export async function loadAllLocalData(): Promise<{
  settings: AppSettings;
  cards: CreditCard[];
  transactions: Transaction[];
}> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_SETTINGS, STORE_CARDS, STORE_TRANSACTIONS], 'readonly');
    const [storedSettings, cards, transactions] = await Promise.all([
      reqToPromise(tx.objectStore(STORE_SETTINGS).get('app-settings')) as Promise<
        Partial<AppSettings> | undefined
      >,
      reqToPromise(tx.objectStore(STORE_CARDS).getAll()) as Promise<CreditCard[]>,
      reqToPromise(tx.objectStore(STORE_TRANSACTIONS).getAll()) as Promise<Transaction[]>,
    ]);

    const settings = normalizeStoredSettings(storedSettings);

    syncThemeCache(settings.theme);
    setCachedBiometricLock(Boolean(settings.biometricLockEnabled));

    return {
      settings,
      cards: cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      transactions: transactions.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        return dateCmp !== 0 ? dateCmp : b.createdAt.localeCompare(a.createdAt);
      }),
    };
  } finally {
    db.close();
  }
}

export function syncThemeCache(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage quota errors in private mode
  }
}

export async function saveSettingsLocal(settings: AppSettings): Promise<void> {
  const normalized = normalizeStoredSettings(settings);
  syncThemeCache(normalized.theme);
  setCachedBiometricLock(Boolean(normalized.biometricLockEnabled));
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put(normalized);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function saveCardLocal(card: CreditCard): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_CARDS, 'readwrite');
    tx.objectStore(STORE_CARDS).put(card);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteCardAndTransactionsLocal(cardId: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_CARDS, STORE_TRANSACTIONS], 'readwrite');
    tx.objectStore(STORE_CARDS).delete(cardId);

    const txStore = tx.objectStore(STORE_TRANSACTIONS);
    const index = txStore.index('cardId');
    const keys = await reqToPromise(index.getAllKeys(IDBKeyRange.only(cardId)));
    for (const key of keys) {
      txStore.delete(key);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function saveTransactionLocal(
  transaction: Transaction,
  updatedSettings?: AppSettings
): Promise<void> {
  const db = await openDatabase();
  try {
    const stores = updatedSettings ? [STORE_TRANSACTIONS, STORE_SETTINGS] : [STORE_TRANSACTIONS];
    const tx = db.transaction(stores, 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).put({
      ...transaction,
      amount: roundMoney(transaction.amount),
    });
    if (updatedSettings) {
      const normalized = normalizeStoredSettings(updatedSettings);
      syncThemeCache(normalized.theme);
      tx.objectStore(STORE_SETTINGS).put(normalized);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteTransactionLocal(
  transactionId: string,
  updatedSettings?: AppSettings
): Promise<void> {
  const db = await openDatabase();
  try {
    const stores = updatedSettings ? [STORE_TRANSACTIONS, STORE_SETTINGS] : [STORE_TRANSACTIONS];
    const tx = db.transaction(stores, 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).delete(transactionId);
    if (updatedSettings) {
      const normalized = normalizeStoredSettings(updatedSettings);
      syncThemeCache(normalized.theme);
      tx.objectStore(STORE_SETTINGS).put(normalized);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function replaceAllLocalData(data: {
  settings: AppSettings;
  cards: CreditCard[];
  transactions: Transaction[];
}): Promise<void> {
  const normalizedSettings = normalizeStoredSettings(data.settings);
  syncThemeCache(normalizedSettings.theme);
  setCachedBiometricLock(Boolean(normalizedSettings.biometricLockEnabled));
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_SETTINGS, STORE_CARDS, STORE_TRANSACTIONS], 'readwrite');
    const settingsStore = tx.objectStore(STORE_SETTINGS);
    const cardsStore = tx.objectStore(STORE_CARDS);
    const txStore = tx.objectStore(STORE_TRANSACTIONS);

    settingsStore.clear();
    cardsStore.clear();
    txStore.clear();

    settingsStore.put(normalizedSettings);

    for (const card of data.cards) {
      cardsStore.put(card);
    }
    for (const item of data.transactions) {
      txStore.put({
        ...item,
        amount: roundMoney(item.amount),
      });
    }

    await txDone(tx);
  } finally {
    db.close();
  }
}

export function buildBackupPayload(
  settings: AppSettings,
  cards: CreditCard[],
  transactions: Transaction[]
): BackupPayload {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    app: 'CardLedger',
    settings: normalizeStoredSettings(settings),
    cards,
    transactions,
  };
}

export function validateBackupPayload(
  raw: unknown
): {valid: true; payload: BackupPayload} | {valid: false; error: string} {
  if (!raw || typeof raw !== 'object') {
    return {valid: false, error: 'Backup file does not contain a valid JSON object.'};
  }

  const obj = raw as Record<string, unknown>;
  if (!obj.settings || typeof obj.settings !== 'object') {
    return {valid: false, error: 'Backup is missing settings / bank balance data.'};
  }
  if (!Array.isArray(obj.cards)) {
    return {valid: false, error: 'Backup is missing the credit cards list.'};
  }
  if (!Array.isArray(obj.transactions)) {
    return {valid: false, error: 'Backup is missing the transactions list.'};
  }

  const s = obj.settings as Record<string, unknown>;
  const nowIso = new Date().toISOString();
  const bankUpdatedAt = typeof s.bankUpdatedAt === 'string' && s.bankUpdatedAt ? s.bankUpdatedAt : nowIso;

  const currency = VALID_CURRENCIES.includes(s.currency as CurrencyCode)
    ? (s.currency as CurrencyCode)
    : 'INR';
  const theme = VALID_THEMES.includes(s.theme as ThemeMode) ? (s.theme as ThemeMode) : 'system';

  let sanitizedAccounts: BankAccount[];
  if (Array.isArray(s.bankAccounts)) {
    const accountIds = new Set<string>();
    sanitizedAccounts = [];
    for (let i = 0; i < s.bankAccounts.length; i++) {
      const a = s.bankAccounts[i] as Record<string, unknown>;
      if (!a || typeof a !== 'object') {
        return {valid: false, error: `Bank account #${i + 1} in backup is invalid.`};
      }
      const id = typeof a.id === 'string' && a.id.trim() ? a.id.trim() : '';
      const name = typeof a.name === 'string' && a.name.trim() ? a.name.trim() : '';
      const balance = Number(a.balance);
      if (!id || !name) {
        return {valid: false, error: `Bank account #${i + 1} is missing an id or name.`};
      }
      if (accountIds.has(id)) {
        return {valid: false, error: `Duplicate bank account ID "${id}" found in backup.`};
      }
      if (!Number.isFinite(balance) || Math.abs(balance) > MAX_AMOUNT) {
        return {valid: false, error: `Bank account "${name}" has an invalid balance.`};
      }
      accountIds.add(id);
      sanitizedAccounts.push({
        id,
        name: name.slice(0, 60),
        balance: roundMoney(balance),
        updatedAt: typeof a.updatedAt === 'string' && a.updatedAt ? a.updatedAt : bankUpdatedAt,
      });
    }
  } else {
    // Legacy schemaVersion 1 backup: migrate single bank account seamlessly
    const bankBalance = Number(s.bankBalance);
    if (!Number.isFinite(bankBalance) || Math.abs(bankBalance) > MAX_AMOUNT) {
      return {valid: false, error: 'Bank balance in backup is invalid.'};
    }
    sanitizedAccounts = [
      {
        id: 'bank-primary',
        name:
          typeof s.bankName === 'string' && s.bankName.trim()
            ? s.bankName.trim().slice(0, 60)
            : 'Primary Bank Account',
        balance: roundMoney(bankBalance),
        updatedAt: bankUpdatedAt,
      },
    ];
  }

  const sanitizedSettings: AppSettings = {
    id: 'app-settings',
    ...buildBankSummaryFields(sanitizedAccounts, bankUpdatedAt),
    currency,
    theme,
    biometricLockEnabled: Boolean(s.biometricLockEnabled),
  };

  const cardIds = new Set<string>();
  const sanitizedCards: CreditCard[] = [];

  for (let i = 0; i < obj.cards.length; i++) {
    const c = obj.cards[i] as Record<string, unknown>;
    if (!c || typeof c !== 'object') {
      return {valid: false, error: `Card entry #${i + 1} is invalid.`};
    }
    const id = typeof c.id === 'string' && c.id.trim() ? c.id.trim() : '';
    const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : '';
    const billingDay = Number(c.billingDay);
    const dueDay = Number(c.dueDay);

    if (!id || !name) {
      return {valid: false, error: `Card entry #${i + 1} is missing an id or name.`};
    }
    if (cardIds.has(id)) {
      return {valid: false, error: `Duplicate credit card ID "${id}" found in backup.`};
    }
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
      return {valid: false, error: `Card "${name}" has an invalid billing day.`};
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return {valid: false, error: `Card "${name}" has an invalid payment due day.`};
    }

    let limit: number | null = null;
    if (c.limit !== null && c.limit !== undefined && c.limit !== '') {
      const parsedLimit = Number(c.limit);
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0 || parsedLimit > MAX_AMOUNT) {
        return {valid: false, error: `Card "${name}" has an invalid credit limit.`};
      }
      limit = roundMoney(parsedLimit);
    }

    cardIds.add(id);
    sanitizedCards.push({
      id,
      name: name.slice(0, 60),
      lastFour:
        typeof c.lastFour === 'string' ? c.lastFour.replace(/\D/g, '').slice(0, 4) : '',
      limit,
      billingDay,
      dueDay,
      colorToken: VALID_COLORS.includes(c.colorToken as CardColorToken)
        ? (c.colorToken as CardColorToken)
        : 'teal',
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : nowIso,
    });
  }

  const txIds = new Set<string>();
  const sanitizedTransactions: Transaction[] = [];
  for (let i = 0; i < obj.transactions.length; i++) {
    const t = obj.transactions[i] as Record<string, unknown>;
    if (!t || typeof t !== 'object') {
      return {valid: false, error: `Transaction #${i + 1} is invalid.`};
    }
    const id = typeof t.id === 'string' && t.id.trim() ? t.id.trim() : '';
    const cardId = typeof t.cardId === 'string' ? t.cardId.trim() : '';
    const type = t.type === 'spend' || t.type === 'payment' ? t.type : null;
    const amount = Number(t.amount);
    const description = typeof t.description === 'string' ? t.description.trim() : '';
    const date = typeof t.date === 'string' ? t.date.trim() : '';

    if (!id || !cardId || !cardIds.has(cardId)) {
      return {
        valid: false,
        error: `Transaction #${i + 1} references a credit card that is not in the backup.`,
      };
    }
    if (txIds.has(id)) {
      return {valid: false, error: `Duplicate transaction ID "${id}" found in backup.`};
    }
    if (!type) {
      return {valid: false, error: `Transaction #${i + 1} has an invalid type.`};
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      return {valid: false, error: `Transaction #${i + 1} has an invalid amount.`};
    }
    if (!isValidCalendarDate(date)) {
      return {valid: false, error: `Transaction #${i + 1} has an invalid calendar date.`};
    }

    txIds.add(id);
    sanitizedTransactions.push({
      id,
      cardId,
      type,
      amount: roundMoney(amount),
      description: description ? description.slice(0, 120) : type === 'payment' ? 'Card Payment' : 'Card Spend',
      category:
        type === 'spend' &&
        typeof t.category === 'string' &&
        VALID_SPENDING_CATEGORIES.includes(t.category as SpendingCategory)
          ? (t.category as SpendingCategory)
          : undefined,
      date,
      statementCycleKey:
        typeof t.statementCycleKey === 'string' && isValidCalendarDate(t.statementCycleKey)
          ? t.statementCycleKey
          : undefined,
      deductFromBank: typeof t.deductFromBank === 'boolean' ? t.deductFromBank : undefined,
      bankAccountId:
        typeof t.bankAccountId === 'string' && t.bankAccountId.trim()
          ? t.bankAccountId.trim()
          : undefined,
      createdAt: typeof t.createdAt === 'string' ? t.createdAt : nowIso,
      updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : nowIso,
    });
  }

  return {
    valid: true,
    payload: {
      schemaVersion: 2,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : nowIso,
      app: 'CardLedger',
      settings: sanitizedSettings,
      cards: sanitizedCards,
      transactions: sanitizedTransactions,
    },
  };
}
