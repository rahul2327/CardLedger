import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  DEFAULT_SETTINGS,
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
  CardColorToken,
  CreditCard,
  CurrencyCode,
  ThemeMode,
  Transaction,
  TransactionType,
} from '../types/finance';
import {computeDashboardSummary, getTodayDateString, roundMoney} from '../utils/financeEngine';
import {createSampleDataset} from '../utils/sampleData';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  date: string;
  statementCycleKey?: string;
  deductFromBank?: boolean;
}

export function useFinanceStore() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState<string>(() => getTodayDateString());

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
        setSettings(data.settings);
        setCards(data.cards);
        setTransactions(data.transactions);
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
  }, []);

  const summary = useMemo(
    () => computeDashboardSummary(settings, cards, transactions, todayDate),
    [settings, cards, transactions, todayDate]
  );

  const updateBankBalance = useCallback(
    async (bankBalance: number, bankName?: string) => {
      const next: AppSettings = {
        ...settings,
        bankBalance: roundMoney(bankBalance),
        bankName: bankName !== undefined && bankName.trim() ? bankName.trim() : settings.bankName,
        bankUpdatedAt: new Date().toISOString(),
      };
      await saveSettingsLocal(next);
      setSettings(next);
    },
    [settings]
  );

  const updateTheme = useCallback(
    async (theme: ThemeMode) => {
      const next: AppSettings = {...settings, theme};
      await saveSettingsLocal(next);
      setSettings(next);
    },
    [settings]
  );

  const updateCurrency = useCallback(
    async (currency: CurrencyCode) => {
      const next: AppSettings = {...settings, currency};
      await saveSettingsLocal(next);
      setSettings(next);
    },
    [settings]
  );

  const saveCard = useCallback(
    async (input: CardInput): Promise<CreditCard> => {
      const existing = input.id ? cards.find((c) => c.id === input.id) : undefined;
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
      setCards((prev) =>
        existing
          ? prev.map((c) => (c.id === record.id ? record : c))
          : [...prev, record]
      );
      return record;
    },
    [cards]
  );

  const deleteCard = useCallback(async (cardId: string) => {
    await deleteCardAndTransactionsLocal(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setTransactions((prev) => prev.filter((t) => t.cardId !== cardId));
  }, []);

  const saveTransaction = useCallback(
    async (input: TransactionInput): Promise<Transaction> => {
      const nowIso = new Date().toISOString();
      const existing = input.id ? transactions.find((t) => t.id === input.id) : undefined;
      const amount = roundMoney(input.amount);

      const record: Transaction = {
        id: existing ? existing.id : generateId('tx'),
        cardId: input.cardId,
        type: input.type,
        amount,
        description: input.description.trim(),
        date: input.date,
        statementCycleKey: input.statementCycleKey || undefined,
        deductFromBank: input.type === 'payment' ? Boolean(input.deductFromBank) : undefined,
        createdAt: existing ? existing.createdAt : nowIso,
        updatedAt: nowIso,
      };

      // Calculate exact bank balance delta if payment deducts from bank
      const prevBankDeduction =
        existing && existing.type === 'payment' && existing.deductFromBank ? existing.amount : 0;
      const nextBankDeduction =
        record.type === 'payment' && record.deductFromBank ? record.amount : 0;
      const bankDelta = roundMoney(prevBankDeduction - nextBankDeduction);

      let nextSettings: AppSettings | undefined;
      if (bankDelta !== 0) {
        nextSettings = {
          ...settings,
          bankBalance: roundMoney(settings.bankBalance + bankDelta),
          bankUpdatedAt: nowIso,
        };
      }

      await saveTransactionLocal(record, nextSettings);
      if (nextSettings) {
        setSettings(nextSettings);
      }

      setTransactions((prev) => {
        const updated = existing
          ? prev.map((t) => (t.id === record.id ? record : t))
          : [record, ...prev];
        return updated.sort((a, b) => {
          const cmp = b.date.localeCompare(a.date);
          return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
        });
      });

      return record;
    },
    [transactions, settings]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string, refundBankBalance = false) => {
      const existing = transactions.find((t) => t.id === transactionId);
      if (!existing) return;

      let nextSettings: AppSettings | undefined;
      if (refundBankBalance && existing.type === 'payment' && existing.deductFromBank) {
        nextSettings = {
          ...settings,
          bankBalance: roundMoney(settings.bankBalance + existing.amount),
          bankUpdatedAt: new Date().toISOString(),
        };
      }

      await deleteTransactionLocal(transactionId, nextSettings);
      if (nextSettings) {
        setSettings(nextSettings);
      }
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    },
    [transactions, settings]
  );

  const restoreBackup = useCallback(async (payload: BackupPayload) => {
    const sortedCards = [...payload.cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const sortedTxs = [...payload.transactions].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
    });

    await replaceAllLocalData({
      settings: payload.settings,
      cards: sortedCards,
      transactions: sortedTxs,
    });

    setSettings(payload.settings);
    setCards(sortedCards);
    setTransactions(sortedTxs);
  }, []);

  const loadSampleData = useCallback(async () => {
    const sample = createSampleDataset(settings.theme);
    await replaceAllLocalData(sample);
    setSettings(sample.settings);
    setCards(sample.cards);
    setTransactions(
      [...sample.transactions].sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      })
    );
  }, [settings.theme]);

  const clearAllData = useCallback(async () => {
    const resetSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      currency: settings.currency,
      theme: settings.theme,
      bankUpdatedAt: new Date().toISOString(),
    };
    await replaceAllLocalData({
      settings: resetSettings,
      cards: [],
      transactions: [],
    });
    setSettings(resetSettings);
    setCards([]);
    setTransactions([]);
  }, [settings.currency, settings.theme]);

  return {
    isLoading,
    storageError,
    todayDate,
    settings,
    cards,
    transactions,
    summary,
    updateBankBalance,
    updateTheme,
    updateCurrency,
    saveCard,
    deleteCard,
    saveTransaction,
    deleteTransaction,
    restoreBackup,
    loadSampleData,
    clearAllData,
  };
}
