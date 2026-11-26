import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  DEFAULT_SETTINGS,
  buildBankSummaryFields,
  createDefaultSettings,
  deleteCardAndTransactionsLocal,
  deleteTransactionLocal,
  loadAllLocalData,
  replaceAllLocalData,
  saveCardLocal,
  saveSettingsLocal,
  saveTransactionLocal,
} from '../db/indexedDb';
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
  TransactionType,
} from '../types/finance';
import {inferSpendingCategory} from '../utils/categories';
import {computeDashboardSummary, getTodayDateString, roundMoney} from '../utils/financeEngine';
import {createSampleDataset} from '../utils/sampleData';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface BankAccountInput {
  id?: string;
  name: string;
  balance: number;
}

export interface CardInput {
  id?: string;
  name: string;
  lastFour: string;
  limit: number | null;
  billingDay: number;
  dueDay: number;
  colorToken: CardColorToken;
}

export interface TransactionInput {
  id?: string;
  cardId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: SpendingCategory;
  date: string;
  statementCycleKey?: string;
  deductFromBank?: boolean;
  bankAccountId?: string;
}

function sortTransactions(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
  });
}

export function useFinanceStore() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState<string>(() => getTodayDateString());

  // Live refs prevent stale-closure overwrites during rapid consecutive mutations
  const settingsRef = useRef<AppSettings>(settings);
  const cardsRef = useRef<CreditCard[]>(cards);
  const transactionsRef = useRef<Transaction[]>(transactions);

  const commitSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const commitCards = useCallback((next: CreditCard[]) => {
    cardsRef.current = next;
    setCards(next);
  }, []);

  const commitTransactions = useCallback((next: Transaction[]) => {
    const sorted = sortTransactions(next);
    transactionsRef.current = sorted;
    setTransactions(sorted);
  }, []);

  // Keep today's date fresh if app stays open across midnight
  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = getTodayDateString();
      setTodayDate((prev) => (prev !== current ? current : prev));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Load persisted data from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadAllLocalData()
      .then((data) => {
        if (!active) return;
        commitSettings(data.settings);
        commitCards(data.cards);
        commitTransactions(data.transactions);
        setStorageError(null);
      })
      .catch((err) => {
        if (!active) return;
        setStorageError(
          err instanceof Error ? err.message : 'Unable to read local database on this device.'
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [commitSettings, commitCards, commitTransactions]);

  const summary = useMemo(
    () => computeDashboardSummary(settings, cards, transactions, todayDate),
    [settings, cards, transactions, todayDate]
  );

  const saveBankAccount = useCallback(
    async (input: BankAccountInput): Promise<BankAccount> => {
      const current = settingsRef.current;
      const nowIso = new Date().toISOString();
      const existing = input.id
        ? current.bankAccounts.find((a) => a.id === input.id)
        : undefined;

      const record: BankAccount = {
        id: existing ? existing.id : generateId('bank'),
        name: input.name.trim().slice(0, 60) || 'Bank Account',
        balance: roundMoney(input.balance),
        updatedAt: nowIso,
      };

      const nextAccounts = existing
        ? current.bankAccounts.map((a) => (a.id === record.id ? record : a))
        : [...current.bankAccounts, record];

      const next: AppSettings = {
        ...current,
        ...buildBankSummaryFields(nextAccounts, nowIso),
      };

      await saveSettingsLocal(next);
      commitSettings(next);
      return record;
    },
    [commitSettings]
  );

  const deleteBankAccount = useCallback(
    async (accountId: string) => {
      const current = settingsRef.current;
      const nowIso = new Date().toISOString();
      const nextAccounts = current.bankAccounts.filter((a) => a.id !== accountId);
      const next: AppSettings = {
        ...current,
        ...buildBankSummaryFields(nextAccounts, nowIso),
      };
      await saveSettingsLocal(next);
      commitSettings(next);
    },
    [commitSettings]
  );

  const updateTheme = useCallback(
    async (theme: ThemeMode) => {
      const next: AppSettings = {...settingsRef.current, theme};
      await saveSettingsLocal(next);
      commitSettings(next);
    },
    [commitSettings]
  );

  const updateCurrency = useCallback(
    async (currency: CurrencyCode) => {
      const next: AppSettings = {...settingsRef.current, currency};
      await saveSettingsLocal(next);
      commitSettings(next);
    },
    [commitSettings]
  );

  const updateBiometricLock = useCallback(
    async (biometricLockEnabled: boolean) => {
      const next: AppSettings = {...settingsRef.current, biometricLockEnabled};
      await saveSettingsLocal(next);
      commitSettings(next);
    },
    [commitSettings]
  );

  const saveCard = useCallback(
    async (input: CardInput): Promise<CreditCard> => {
      const currentCards = cardsRef.current;
      const existing = input.id ? currentCards.find((c) => c.id === input.id) : undefined;
      const record: CreditCard = {
        id: existing ? existing.id : generateId('card'),
        name: input.name.trim(),
        lastFour: input.lastFour.replace(/\D/g, '').slice(0, 4),
        limit: input.limit !== null ? roundMoney(input.limit) : null,
        billingDay: input.billingDay,
        dueDay: input.dueDay,
        colorToken: input.colorToken,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
      };

      await saveCardLocal(record);
      const nextCards = existing
        ? currentCards.map((c) => (c.id === record.id ? record : c))
        : [...currentCards, record];
      commitCards(nextCards);
      return record;
    },
    [commitCards]
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      await deleteCardAndTransactionsLocal(cardId);
      commitCards(cardsRef.current.filter((c) => c.id !== cardId));
      commitTransactions(transactionsRef.current.filter((t) => t.cardId !== cardId));
    },
    [commitCards, commitTransactions]
  );

  const saveTransaction = useCallback(
    async (input: TransactionInput): Promise<Transaction> => {
      if (!cardsRef.current.some((c) => c.id === input.cardId)) {
        throw new Error('Selected credit card no longer exists.');
      }

      const nowIso = new Date().toISOString();
      const currentTxs = transactionsRef.current;
      const currentSettings = settingsRef.current;
      const existing = input.id ? currentTxs.find((t) => t.id === input.id) : undefined;
      const amount = roundMoney(input.amount);

      const wantsBankDeduction = input.type === 'payment' && Boolean(input.deductFromBank);
      const resolvedBankAccountId = wantsBankDeduction
        ? currentSettings.bankAccounts.find((a) => a.id === input.bankAccountId)?.id ??
          currentSettings.bankAccounts[0]?.id
        : undefined;
      const effectiveDeductFromBank = Boolean(wantsBankDeduction && resolvedBankAccountId);

      const trimmedDescription = input.description.trim();
      const record: Transaction = {
        id: existing ? existing.id : generateId('tx'),
        cardId: input.cardId,
        type: input.type,
        amount,
        description: trimmedDescription,
        category:
          input.type === 'spend'
            ? input.category ?? inferSpendingCategory(trimmedDescription)
            : undefined,
        date: input.date,
        statementCycleKey:
          input.type === 'payment' && input.statementCycleKey
            ? input.statementCycleKey
            : undefined,
        deductFromBank: input.type === 'payment' ? effectiveDeductFromBank : undefined,
        bankAccountId: effectiveDeductFromBank ? resolvedBankAccountId : undefined,
        createdAt: existing ? existing.createdAt : nowIso,
        updatedAt: nowIso,
      };

      // Calculate exact per-account balance updates (handles amount edits, toggling deduct, and switching bank accounts)
      const nextAccounts = currentSettings.bankAccounts.map((acc) => ({...acc}));
      let bankChanged = false;

      // Step 1: Refund previous deduction if editing an existing bank-deducted payment
      if (existing && existing.type === 'payment' && existing.deductFromBank) {
        const prevTarget = existing.bankAccountId
          ? nextAccounts.find((a) => a.id === existing.bankAccountId)
          : nextAccounts[0];
        if (prevTarget) {
          prevTarget.balance = roundMoney(prevTarget.balance + existing.amount);
          prevTarget.updatedAt = nowIso;
          bankChanged = true;
        }
      }

      // Step 2: Apply new deduction to the selected bank account
      if (record.type === 'payment' && record.deductFromBank && record.bankAccountId) {
        const nextTarget = nextAccounts.find((a) => a.id === record.bankAccountId);
        if (nextTarget) {
          nextTarget.balance = roundMoney(nextTarget.balance - record.amount);
          nextTarget.updatedAt = nowIso;
          bankChanged = true;
        }
      }

      let nextSettings: AppSettings | undefined;
      if (bankChanged) {
        nextSettings = {
          ...currentSettings,
          ...buildBankSummaryFields(nextAccounts, nowIso),
        };
      }

      await saveTransactionLocal(record, nextSettings);
      if (nextSettings) {
        commitSettings(nextSettings);
      }

      const updatedTxs = existing
        ? currentTxs.map((t) => (t.id === record.id ? record : t))
        : [record, ...currentTxs];
      commitTransactions(updatedTxs);

      return record;
    },
    [commitSettings, commitTransactions]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string, refundBankBalance = false) => {
      const currentTxs = transactionsRef.current;
      const currentSettings = settingsRef.current;
      const existing = currentTxs.find((t) => t.id === transactionId);
      if (!existing) return;

      let nextSettings: AppSettings | undefined;
      if (refundBankBalance && existing.type === 'payment' && existing.deductFromBank) {
        const nowIso = new Date().toISOString();
        const nextAccounts = currentSettings.bankAccounts.map((acc) => ({...acc}));
        const refundTarget = existing.bankAccountId
          ? nextAccounts.find((a) => a.id === existing.bankAccountId)
          : nextAccounts[0];

        if (refundTarget) {
          refundTarget.balance = roundMoney(refundTarget.balance + existing.amount);
          refundTarget.updatedAt = nowIso;
          nextSettings = {
            ...currentSettings,
            ...buildBankSummaryFields(nextAccounts, nowIso),
          };
        }
      }

      await deleteTransactionLocal(transactionId, nextSettings);
      if (nextSettings) {
        commitSettings(nextSettings);
      }
      commitTransactions(currentTxs.filter((t) => t.id !== transactionId));
    },
    [commitSettings, commitTransactions]
  );

  const restoreBackup = useCallback(
    async (payload: BackupPayload) => {
      const sortedCards = [...payload.cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const sortedTxs = sortTransactions(payload.transactions);

      await replaceAllLocalData({
        settings: payload.settings,
        cards: sortedCards,
        transactions: sortedTxs,
      });

      commitSettings(payload.settings);
      commitCards(sortedCards);
      commitTransactions(sortedTxs);
    },
    [commitSettings, commitCards, commitTransactions]
  );

  const loadSampleData = useCallback(async () => {
    const sample = createSampleDataset(settingsRef.current.theme);
    await replaceAllLocalData(sample);
    commitSettings(sample.settings);
    commitCards(sample.cards);
    commitTransactions(sample.transactions);
  }, [commitSettings, commitCards, commitTransactions]);

  const clearAllData = useCallback(async () => {
    const current = settingsRef.current;
    const base = createDefaultSettings();
    const resetSettings: AppSettings = {
      ...base,
      currency: current.currency,
      theme: current.theme,
    };
    await replaceAllLocalData({
      settings: resetSettings,
      cards: [],
      transactions: [],
    });
    commitSettings(resetSettings);
    commitCards([]);
    commitTransactions([]);
  }, [commitSettings, commitCards, commitTransactions]);

  return {
    isLoading,
    storageError,
    todayDate,
    settings,
    cards,
    transactions,
    summary,
    saveBankAccount,
    deleteBankAccount,
    updateTheme,
    updateCurrency,
    updateBiometricLock,
    saveCard,
    deleteCard,
    saveTransaction,
    deleteTransaction,
    restoreBackup,
    loadSampleData,
    clearAllData,
  };
}
