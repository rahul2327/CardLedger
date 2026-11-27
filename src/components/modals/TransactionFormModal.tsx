import React, {useEffect, useMemo, useState} from 'react';
import {ArrowDownLeft, CreditCard, Landmark, Sparkles} from 'lucide-react';
import type {
  BankAccount,
  CardSummary,
  CashbackDestination,
  CurrencyCode,
  SpendingCategory,
  Transaction,
  TransactionType,
} from '../../types/finance';
import {getTransactionBankEffect, type TransactionInput} from '../../hooks/useFinanceStore';
import {
  SPENDING_CATEGORIES,
  inferSpendingCategory,
  resolveTransactionCategory,
} from '../../utils/categories';
import {getTodayDateString, isValidCalendarDate, roundMoney} from '../../utils/financeEngine';
import {formatMoney, formatShortDate, getCurrencySymbol} from '../../utils/formatters';
import {DialogShell} from '../ui/DialogShell';

export interface TransactionModalPreset {
  type?: TransactionType;
  cardId?: string;
  bankAccountId?: string;
  amount?: number;
  description?: string;
  statementCycleKey?: string;
  cashbackDestination?: CashbackDestination;
}

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  cardSummaries: CardSummary[];
  bankAccounts: BankAccount[];
  currency: CurrencyCode;
  editingTransaction?: Transaction | null;
  preset?: TransactionModalPreset | null;
  onSave: (input: TransactionInput) => Promise<void>;
}

const AUTO_DESCRIPTIONS: Record<TransactionType, string> = {
  spend: '',
  bank_spend: '',
  payment: 'Credit Card Bill Payment',
  cashback: 'Credit Card Cashback',
};

const AUTO_DESCRIPTION_SET = new Set(Object.values(AUTO_DESCRIPTIONS));

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  open,
  onClose,
  cardSummaries,
  bankAccounts,
  currency,
  editingTransaction,
  preset,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('spend');
  const [cardId, setCardId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SpendingCategory>('other');
  const [categoryManuallyPicked, setCategoryManuallyPicked] = useState(false);
  const [date, setDate] = useState(getTodayDateString());
  const [statementCycleKey, setStatementCycleKey] = useState<string>('');
  const [deductFromBank, setDeductFromBank] = useState(true);
  const [bankAccountId, setBankAccountId] = useState('');
  const [cashbackDestination, setCashbackDestination] = useState<CashbackDestination>('statement');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasCards = cardSummaries.length > 0;
  const hasBankAccounts = bankAccounts.length > 0;

  useEffect(() => {
    if (!open) return;
    const defaultAccountId = bankAccounts[0]?.id ?? '';

    if (editingTransaction) {
      setType(editingTransaction.type);
      setCardId(editingTransaction.cardId || cardSummaries[0]?.card.id || '');
      setAmountInput(String(editingTransaction.amount));
      setDescription(editingTransaction.description);
      setCategory(resolveTransactionCategory(editingTransaction));
      setCategoryManuallyPicked(true);
      setDate(editingTransaction.date);
      setStatementCycleKey(editingTransaction.statementCycleKey ?? '');
      const shouldDefaultDeduct =
        editingTransaction.type === 'bank_spend'
          ? editingTransaction.deductFromBank !== false
          : Boolean(editingTransaction.deductFromBank);
      setDeductFromBank(shouldDefaultDeduct && bankAccounts.length > 0);
      setCashbackDestination(editingTransaction.cashbackDestination ?? 'statement');
      const existingAccStillPresent =
        editingTransaction.bankAccountId &&
        bankAccounts.some((a) => a.id === editingTransaction.bankAccountId);
      setBankAccountId(
        existingAccStillPresent ? editingTransaction.bankAccountId! : defaultAccountId
      );
    } else {
      const requestedType = preset?.type ?? (hasCards ? 'spend' : 'bank_spend');
      const initialType: TransactionType =
        !hasCards && requestedType !== 'bank_spend' ? 'bank_spend' : requestedType;
      const defaultCardId = preset?.cardId ?? cardSummaries[0]?.card.id ?? '';
      const initialDesc = preset?.description ?? AUTO_DESCRIPTIONS[initialType];
      setType(initialType);
      setCardId(defaultCardId);
      setAmountInput(preset?.amount ? String(preset.amount) : '');
      setDescription(initialDesc);
      setCategory(inferSpendingCategory(initialDesc));
      setCategoryManuallyPicked(false);
      setDate(getTodayDateString());
      setStatementCycleKey(preset?.statementCycleKey ?? '');
      setDeductFromBank(bankAccounts.length > 0);
      setCashbackDestination(preset?.cashbackDestination ?? 'statement');
      const presetAccPresent =
        preset?.bankAccountId && bankAccounts.some((a) => a.id === preset.bankAccountId);
      setBankAccountId(presetAccPresent ? preset!.bankAccountId! : defaultAccountId);
    }
    setError(null);
    setSaving(false);
  }, [open, editingTransaction, preset, cardSummaries, bankAccounts, hasCards]);

  const selectedCardSummary = useMemo(
    () => cardSummaries.find((cs) => cs.card.id === cardId) ?? null,
    [cardSummaries, cardId]
  );

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((a) => a.id === bankAccountId) ?? bankAccounts[0] ?? null,
    [bankAccounts, bankAccountId]
  );

  const previousBankEffect = useMemo(() => {
    if (!editingTransaction) return null;
    return getTransactionBankEffect(editingTransaction, bankAccounts);
  }, [editingTransaction, bankAccounts]);

  const selectableStatements = useMemo(() => {
    if (!selectedCardSummary) return [];
    return selectedCardSummary.generatedStatements.filter(
      (s) => s.remainingAmount > 0 || (statementCycleKey && s.cycleKey === statementCycleKey)
    );
  }, [selectedCardSummary, statementCycleKey]);

  const parsedAmount = Number(amountInput);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  // Compute exact projected balance for the selected bank account
  const projectedSelectedAccountBalance = useMemo(() => {
    if (!selectedBankAccount) return 0;
    let balance = selectedBankAccount.balance;

    // Reverse old bank effect if it touched this same account
    if (previousBankEffect && previousBankEffect.account.id === selectedBankAccount.id) {
      balance = roundMoney(balance - previousBankEffect.delta);
    }

    // Apply prospective new bank effect
    if (amountValid) {
      if ((type === 'payment' || type === 'bank_spend') && deductFromBank) {
        balance = roundMoney(balance - parsedAmount);
      } else if (type === 'cashback' && cashbackDestination === 'bank') {
        balance = roundMoney(balance + parsedAmount);
      }
    }

    return balance;
  }, [
    selectedBankAccount,
    previousBankEffect,
    type,
    deductFromBank,
    cashbackDestination,
    amountValid,
    parsedAmount,
  ]);

  const handleTypeChange = (nextType: TransactionType) => {
    if (nextType !== 'bank_spend' && !hasCards) {
      setError('Add a credit card first to log card spending, payments, or cashback.');
      return;
    }
    if (nextType === 'bank_spend' && !hasBankAccounts) {
      setError('Add a bank account first from Dashboard to log direct Bank / UPI spending.');
      return;
    }

    setType(nextType);
    setError(null);
    if (!editingTransaction) {
      const trimmed = description.trim();
      if (AUTO_DESCRIPTION_SET.has(trimmed)) {
        setDescription(AUTO_DESCRIPTIONS[nextType]);
      }
      if (nextType === 'bank_spend' && hasBankAccounts) {
        setDeductFromBank(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type !== 'bank_spend' && !cardId) {
      setError('Please select a credit card.');
      return;
    }

    if (type === 'bank_spend' && !selectedBankAccount) {
      setError('Please add a bank account first to log Bank / UPI spending.');
      return;
    }

    if (type === 'cashback' && cashbackDestination === 'bank' && !selectedBankAccount) {
      setError('Please add a bank account first, or choose Reduce Card Bill.');
      return;
    }

    const num = Number(amountInput);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (num > 999_999_999.99) {
      setError('Amount exceeds the supported maximum limit.');
      return;
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError('Please enter a brief description.');
      return;
    }

    if (!isValidCalendarDate(date)) {
      setError('Please choose a valid calendar date.');
      return;
    }

    setSaving(true);
    try {
      const shouldDeduct =
        (type === 'payment' || type === 'bank_spend') &&
        deductFromBank &&
        Boolean(selectedBankAccount);

      const resolvedBankId =
        type === 'bank_spend' ||
        (type === 'payment' && shouldDeduct) ||
        (type === 'cashback' && cashbackDestination === 'bank')
          ? selectedBankAccount?.id
          : undefined;

      await onSave({
        id: editingTransaction?.id,
        cardId: type === 'bank_spend' ? '' : cardId,
        type,
        amount: roundMoney(num),
        description: trimmedDesc,
        category: type === 'spend' || type === 'bank_spend' ? category : undefined,
        date,
        statementCycleKey:
          (type === 'payment' || (type === 'cashback' && cashbackDestination === 'statement')) &&
          statementCycleKey
            ? statementCycleKey
            : undefined,
        deductFromBank: type === 'payment' || type === 'bank_spend' ? shouldDeduct : undefined,
        bankAccountId: resolvedBankId,
        cashbackDestination: type === 'cashback' ? cashbackDestination : undefined,
      });
      onClose();
    } catch {
      setError('Failed to save entry locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const symbol = getCurrencySymbol(currency);

  const modalTitle = editingTransaction
    ? editingTransaction.type === 'payment'
      ? 'Edit Card Payment'
      : editingTransaction.type === 'bank_spend'
        ? 'Edit Bank / UPI Spend'
        : editingTransaction.type === 'cashback'
          ? 'Edit Cashback'
          : 'Edit Card Spend'
    : type === 'payment'
      ? 'Record Card Payment'
      : type === 'bank_spend'
        ? 'Add Bank / UPI Spend'
        : type === 'cashback'
          ? 'Record Card Cashback'
          : 'Add Card Spend';

  const modalSubtitle =
    type === 'payment'
      ? 'Payments settle generated bills first and immediately reduce card outstanding.'
      : type === 'bank_spend'
        ? 'Track direct bank account or UPI spending when credit card UPI is not accepted.'
        : type === 'cashback'
          ? 'Credit cashback toward your card statement bill or directly into a bank account.'
          : 'Automatically assigned to the matching billing cycle based on transaction date.';

  const submitLabel = saving
    ? 'Saving...'
    : editingTransaction
      ? 'Save Changes'
      : type === 'payment'
        ? 'Record Payment'
        : type === 'bank_spend'
          ? 'Add Bank Spend'
          : type === 'cashback'
            ? 'Add Cashback'
            : 'Add Spending';

  const typeOptions: Array<{
    id: TransactionType;
    label: string;
    icon: React.ComponentType<{className?: string}>;
    disabled: boolean;
  }> = [
    {id: 'spend', label: 'Card Spend', icon: CreditCard, disabled: !hasCards},
    {id: 'bank_spend', label: 'Bank / UPI', icon: Landmark, disabled: !hasBankAccounts},
    {id: 'payment', label: 'Pay Bill', icon: ArrowDownLeft, disabled: !hasCards},
    {id: 'cashback', label: 'Cashback', icon: Sparkles, disabled: !hasCards},
  ];

  const isSpendLike = type === 'spend' || type === 'bank_spend';

  return (
    <DialogShell open={open} onClose={onClose} title={modalTitle} subtitle={modalSubtitle}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Material 3 2x2 Segmented Type Switcher */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-[20px] bg-m3-surface-container border border-m3-outline-variant/60"
          role="tablist"
          aria-label="Transaction type"
        >
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={opt.disabled}
                onClick={() => handleTypeChange(opt.id)}
                className={`h-10 px-2.5 rounded-2xl text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-xs'
                    : opt.disabled
                      ? 'text-m3-on-surface-variant/45 cursor-not-allowed'
                      : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Account Selector: Credit Card OR Bank Account */}
        {type === 'bank_spend' ? (
          <div>
            <label
              htmlFor="tx-bank-spend-select"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Bank Account
            </label>
            <select
              id="tx-bank-spend-select"
              value={selectedBankAccount?.id ?? ''}
              onChange={(e) => {
                setBankAccountId(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none transition-colors"
            >
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Balance {formatMoney(acc.balance, currency)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label
              htmlFor="tx-card-select"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Credit Card
            </label>
            <select
              id="tx-card-select"
              value={cardId}
              onChange={(e) => {
                setCardId(e.target.value);
                setStatementCycleKey('');
                setError(null);
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none transition-colors"
            >
              {cardSummaries.map((cs) => (
                <option key={cs.card.id} value={cs.card.id}>
                  {cs.card.name}
                  {cs.card.lastFour ? ` ••${cs.card.lastFour}` : ''} — Outstanding{' '}
                  {formatMoney(cs.currentOutstanding, currency)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Input + Quick-fill actions for Payments */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="tx-amount-input" className="text-sm font-medium text-m3-on-surface">
              {type === 'cashback' ? 'Cashback Amount' : 'Amount'}
            </label>
            {type === 'payment' && selectedCardSummary && (
              <div className="flex items-center gap-2">
                {selectedCardSummary.upcomingBillAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(selectedCardSummary.upcomingBillAmount))}
                    className="text-xs font-medium text-m3-primary hover:underline whitespace-nowrap"
                  >
                    Bill Due ({formatMoney(selectedCardSummary.upcomingBillAmount, currency)})
                  </button>
                )}
                {selectedCardSummary.currentOutstanding > 0 &&
                  selectedCardSummary.currentOutstanding !==
                    selectedCardSummary.upcomingBillAmount && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(selectedCardSummary.currentOutstanding))}
                      className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-on-surface hover:underline whitespace-nowrap"
                    >
                      Full ({formatMoney(selectedCardSummary.currentOutstanding, currency)})
                    </button>
                  )}
              </div>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-mono text-m3-on-surface-variant">
              {symbol}
            </span>
            <input
              id="tx-amount-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              autoFocus
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setError(null);
              }}
              placeholder="0.00"
              className="w-full min-h-[52px] pl-10 pr-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums text-lg font-medium focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Description & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-3">
            <label
              htmlFor="tx-desc-input"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Description
            </label>
            <input
              id="tx-desc-input"
              type="text"
              maxLength={120}
              value={description}
              onChange={(e) => {
                const nextDesc = e.target.value;
                setDescription(nextDesc);
                if (isSpendLike && !categoryManuallyPicked) {
                  setCategory(inferSpendingCategory(nextDesc));
                }
                setError(null);
              }}
              placeholder={
                type === 'payment'
                  ? 'e.g., NEFT Bill Settlement'
                  : type === 'bank_spend'
                    ? 'e.g., Kirana UPI, Auto, Local Shop'
                    : type === 'cashback'
                      ? 'e.g., Axis Ace 5% Cashback'
                      : 'e.g., Groceries, Fuel, Dining'
              }
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="tx-date-input"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Date
            </label>
            <input
              id="tx-date-input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[48px] px-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Spending Category Picker (for both Card Spend & Bank / UPI Spend) */}
        {isSpendLike && (
          <div>
            <p className="block text-sm font-medium text-m3-on-surface mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Spending category">
              {SPENDING_CATEGORIES.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setCategory(cat.id);
                      setCategoryManuallyPicked(true);
                    }}
                    className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors border ${
                      active
                        ? 'bg-m3-secondary-container text-m3-on-secondary-container border-m3-primary/40'
                        : 'bg-m3-surface-low text-m3-on-surface-variant border-m3-outline-variant/60 hover:text-m3-on-surface'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{backgroundColor: cat.color}}
                    />
                    <span>{cat.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bank / UPI Spend balance deduction toggle */}
        {type === 'bank_spend' && selectedBankAccount && (
          <div className="p-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deductFromBank}
                onChange={(e) => setDeductFromBank(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-m3-outline accent-m3-primary shrink-0"
              />
              <div className="text-sm min-w-0 flex-1">
                <p className="font-medium text-m3-on-surface">
                  Deduct from {selectedBankAccount.name}
                </p>
                <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                  {deductFromBank && amountValid ? (
                    <>
                      {selectedBankAccount.name} updates to{' '}
                      <span
                        className={`font-mono tabular-nums font-medium ${
                          projectedSelectedAccountBalance < 0
                            ? 'text-m3-error'
                            : 'text-m3-on-surface'
                        }`}
                      >
                        {formatMoney(projectedSelectedAccountBalance, currency)}
                      </span>
                      {previousBankEffect &&
                        previousBankEffect.account.id !== selectedBankAccount.id && (
                          <>
                            {' '}
                            ({previousBankEffect.account.name} adjusted by{' '}
                            {previousBankEffect.delta < 0 ? '+' : '−'}
                            {formatMoney(Math.abs(previousBankEffect.delta), currency)})
                          </>
                        )}
                    </>
                  ) : !deductFromBank && previousBankEffect ? (
                    <>
                      {previousBankEffect.account.name} will be adjusted by{' '}
                      <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                        {previousBankEffect.delta < 0 ? '+' : '−'}
                        {formatMoney(Math.abs(previousBankEffect.delta), currency)}
                      </span>
                    </>
                  ) : (
                    'Uncheck if you already subtracted this UPI expense manually.'
                  )}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Cashback-specific destination options */}
        {type === 'cashback' && (
          <div className="space-y-3">
            <div>
              <p className="block text-sm font-medium text-m3-on-surface mb-1.5">
                Where is cashback credited?
              </p>
              <div
                className="grid grid-cols-2 p-1 rounded-full bg-m3-surface-low border border-m3-outline-variant/60"
                role="radiogroup"
                aria-label="Cashback destination"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={cashbackDestination === 'statement'}
                  onClick={() => {
                    setCashbackDestination('statement');
                    setError(null);
                  }}
                  className={`h-9 px-2.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    cashbackDestination === 'statement'
                      ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                      : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                  }`}
                >
                  Reduce Card Bill
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={cashbackDestination === 'bank'}
                  onClick={() => {
                    setCashbackDestination('bank');
                    setError(null);
                  }}
                  className={`h-9 px-2.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    cashbackDestination === 'bank'
                      ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                      : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                  }`}
                >
                  Credit to Bank
                </button>
              </div>
            </div>

            {cashbackDestination === 'statement' ? (
              <div className="space-y-3">
                {selectableStatements.length > 0 && (
                  <div>
                    <label
                      htmlFor="tx-cb-cycle-select"
                      className="block text-sm font-medium text-m3-on-surface mb-1.5"
                    >
                      Apply Cashback To Statement
                    </label>
                    <select
                      id="tx-cb-cycle-select"
                      value={statementCycleKey}
                      onChange={(e) => setStatementCycleKey(e.target.value)}
                      className="w-full min-h-[46px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none"
                    >
                      <option value="">Auto-apply to oldest unpaid bill first</option>
                      {selectableStatements.map((stmt) => (
                        <option key={stmt.cycleKey} value={stmt.cycleKey}>
                          Statement {formatShortDate(stmt.statementDate)} — Due{' '}
                          {formatShortDate(stmt.dueDate)} (
                          {stmt.remainingAmount > 0
                            ? `${formatMoney(stmt.remainingAmount, currency)} left`
                            : 'Settled'}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-m3-success-container/45 border border-m3-success/25 text-xs text-m3-on-surface">
                  Reduces{' '}
                  <span className="font-semibold">
                    {selectedCardSummary?.card.name ?? 'this card'}
                  </span>{' '}
                  outstanding balance without touching your bank account balance.
                </div>
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 text-xs text-m3-on-surface-variant">
                Add a bank account from Dashboard to credit cashback directly to a bank account.
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 space-y-2.5">
                {bankAccounts.length > 1 && (
                  <div>
                    <label
                      htmlFor="tx-cb-bank-select"
                      className="block text-xs font-medium text-m3-on-surface-variant mb-1.5"
                    >
                      Credit To Bank Account
                    </label>
                    <select
                      id="tx-cb-bank-select"
                      value={selectedBankAccount?.id ?? ''}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-m3-surface border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} — {formatMoney(acc.balance, currency)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedBankAccount && (
                  <p className="text-xs text-m3-on-surface-variant">
                    {amountValid ? (
                      <>
                        {selectedBankAccount.name} updates to{' '}
                        <span className="font-mono tabular-nums font-semibold text-m3-success">
                          {formatMoney(projectedSelectedAccountBalance, currency)}
                        </span>{' '}
                        (card bill stays unchanged).
                      </>
                    ) : (
                      <>
                        Adds cashback directly to{' '}
                        <span className="font-medium text-m3-on-surface">
                          {selectedBankAccount.name}
                        </span>{' '}
                        without changing your card bill.
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment-specific options */}
        {type === 'payment' && (
          <div className="space-y-3">
            {selectableStatements.length > 0 && (
              <div>
                <label
                  htmlFor="tx-cycle-select"
                  className="block text-sm font-medium text-m3-on-surface mb-1.5"
                >
                  Apply To Statement
                </label>
                <select
                  id="tx-cycle-select"
                  value={statementCycleKey}
                  onChange={(e) => setStatementCycleKey(e.target.value)}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none"
                >
                  <option value="">Auto-apply to oldest unpaid bill first</option>
                  {selectableStatements.map((stmt) => (
                    <option key={stmt.cycleKey} value={stmt.cycleKey}>
                      Statement {formatShortDate(stmt.statementDate)} — Due{' '}
                      {formatShortDate(stmt.dueDate)} (
                      {stmt.remainingAmount > 0
                        ? `${formatMoney(stmt.remainingAmount, currency)} left`
                        : 'Settled'}
                      )
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bankAccounts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 text-xs text-m3-on-surface-variant">
                Add a bank account from the Dashboard to automatically deduct card payments from it.
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deductFromBank}
                    onChange={(e) => setDeductFromBank(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-m3-outline accent-m3-primary shrink-0"
                  />
                  <div className="text-sm min-w-0 flex-1">
                    <p className="font-medium text-m3-on-surface">
                      {bankAccounts.length === 1 && selectedBankAccount
                        ? `Also deduct from ${selectedBankAccount.name}`
                        : 'Also deduct from a Bank Account'}
                    </p>
                    <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                      {deductFromBank && amountValid && selectedBankAccount ? (
                        <>
                          {selectedBankAccount.name} updates to{' '}
                          <span
                            className={`font-mono tabular-nums font-medium ${
                              projectedSelectedAccountBalance < 0
                                ? 'text-m3-error'
                                : 'text-m3-on-surface'
                            }`}
                          >
                            {formatMoney(projectedSelectedAccountBalance, currency)}
                          </span>
                          {previousBankEffect &&
                            previousBankEffect.account.id !== selectedBankAccount.id && (
                              <>
                                {' '}
                                ({previousBankEffect.account.name} adjusted by{' '}
                                {previousBankEffect.delta < 0 ? '+' : '−'}
                                {formatMoney(Math.abs(previousBankEffect.delta), currency)})
                              </>
                            )}
                        </>
                      ) : !deductFromBank && previousBankEffect ? (
                        <>
                          {previousBankEffect.account.name} will be adjusted by{' '}
                          <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                            {previousBankEffect.delta < 0 ? '+' : '−'}
                            {formatMoney(Math.abs(previousBankEffect.delta), currency)}
                          </span>
                        </>
                      ) : (
                        'Uncheck if you already updated your bank balance manually.'
                      )}
                    </p>
                  </div>
                </label>

                {deductFromBank && bankAccounts.length > 1 && (
                  <div className="pl-8">
                    <label
                      htmlFor="tx-bank-account-select"
                      className="block text-xs font-medium text-m3-on-surface-variant mb-1.5"
                    >
                      Pay From Bank Account
                    </label>
                    <select
                      id="tx-bank-account-select"
                      value={selectedBankAccount?.id ?? ''}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-m3-surface border border-m3-outline-variant text-m3-on-surface text-sm focus:border-m3-primary focus:outline-none"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} — {formatMoney(acc.balance, currency)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-m3-error">{error}</p>}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-full text-[13px] font-medium text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-full bg-m3-primary text-m3-on-primary text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
