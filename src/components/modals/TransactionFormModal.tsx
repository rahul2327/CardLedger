import React, {useEffect, useMemo, useState} from 'react';
import type {
  CardSummary,
  CurrencyCode,
  Transaction,
  TransactionType,
} from '../../types/finance';
import type {TransactionInput} from '../../hooks/useFinanceStore';
import {getTodayDateString, roundMoney} from '../../utils/financeEngine';
import {formatMoney, formatShortDate, getCurrencySymbol} from '../../utils/formatters';
import {DialogShell} from '../ui/DialogShell';

export interface TransactionModalPreset {
  type?: TransactionType;
  cardId?: string;
  amount?: number;
  description?: string;
  statementCycleKey?: string;
}

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  cardSummaries: CardSummary[];
  bankBalance: number;
  currency: CurrencyCode;
  editingTransaction?: Transaction | null;
  preset?: TransactionModalPreset | null;
  onSave: (input: TransactionInput) => Promise<void>;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  open,
  onClose,
  cardSummaries,
  bankBalance,
  currency,
  editingTransaction,
  preset,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('spend');
  const [cardId, setCardId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [statementCycleKey, setStatementCycleKey] = useState<string>('');
  const [deductFromBank, setDeductFromBank] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCardId(editingTransaction.cardId);
      setAmountInput(String(editingTransaction.amount));
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
      setStatementCycleKey(editingTransaction.statementCycleKey ?? '');
      setDeductFromBank(Boolean(editingTransaction.deductFromBank));
    } else {
      const initialType = preset?.type ?? 'spend';
      const defaultCardId = preset?.cardId ?? cardSummaries[0]?.card.id ?? '';
      setType(initialType);
      setCardId(defaultCardId);
      setAmountInput(preset?.amount ? String(preset.amount) : '');
      setDescription(
        preset?.description ?? (initialType === 'payment' ? 'Credit Card Bill Payment' : '')
      );
      setDate(getTodayDateString());
      setStatementCycleKey(preset?.statementCycleKey ?? '');
      setDeductFromBank(true);
    }
    setError(null);
    setSaving(false);
  }, [open, editingTransaction, preset, cardSummaries]);

  const selectedCardSummary = useMemo(
    () => cardSummaries.find((cs) => cs.card.id === cardId) ?? null,
    [cardSummaries, cardId]
  );

  const unpaidStatements = useMemo(() => {
    if (!selectedCardSummary) return [];
    return selectedCardSummary.generatedStatements.filter((s) => s.remainingAmount > 0);
  }, [selectedCardSummary]);

  const parsedAmount = Number(amountInput);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  // Projected bank balance preview for payments
  const projectedBankAfterPayment = useMemo(() => {
    if (type !== 'payment') return bankBalance;
    const prevDeducted =
      editingTransaction && editingTransaction.type === 'payment' && editingTransaction.deductFromBank
        ? editingTransaction.amount
        : 0;
    const nextDeducted = deductFromBank && amountValid ? parsedAmount : 0;
    return roundMoney(bankBalance + prevDeducted - nextDeducted);
  }, [type, bankBalance, editingTransaction, deductFromBank, amountValid, parsedAmount]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setError(null);
    if (!editingTransaction) {
      if (nextType === 'payment' && description.trim() === '') {
        setDescription('Credit Card Bill Payment');
      } else if (nextType === 'spend' && description === 'Credit Card Bill Payment') {
        setDescription('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardId) {
      setError('Please select a credit card.');
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please choose a valid transaction date.');
      return;
    }
    const [y, m, d] = date.split('-').map(Number);
    const checkDate = new Date(y, m - 1, d);
    if (
      checkDate.getFullYear() !== y ||
      checkDate.getMonth() + 1 !== m ||
      checkDate.getDate() !== d
    ) {
      setError('The entered calendar date is invalid.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingTransaction?.id,
        cardId,
        type,
        amount: roundMoney(num),
        description: trimmedDesc,
        date,
        statementCycleKey: type === 'payment' && statementCycleKey ? statementCycleKey : undefined,
        deductFromBank: type === 'payment' ? deductFromBank : undefined,
      });
      onClose();
    } catch {
      setError('Failed to save entry locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={
        editingTransaction
          ? editingTransaction.type === 'payment'
            ? 'Edit Card Payment'
            : 'Edit Spending'
          : type === 'payment'
            ? 'Record Card Payment'
            : 'Add Spending'
      }
      subtitle={
        type === 'payment'
          ? 'Payments settle generated bills first and immediately reduce card outstanding.'
          : 'Automatically assigned to the matching billing cycle based on transaction date.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Material 3 Segmented Type Switcher */}
        <div
          className="grid grid-cols-2 p-1 rounded-full bg-m3-surface-container border border-m3-outline-variant/60"
          role="tablist"
          aria-label="Transaction type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={type === 'spend'}
            onClick={() => handleTypeChange('spend')}
            className={`min-h-[40px] rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              type === 'spend'
                ? 'bg-m3-primary text-m3-on-primary shadow-xs'
                : 'text-m3-on-surface-variant hover:text-m3-on-surface'
            }`}
          >
            Card Spending
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === 'payment'}
            onClick={() => handleTypeChange('payment')}
            className={`min-h-[40px] rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              type === 'payment'
                ? 'bg-m3-primary text-m3-on-primary shadow-xs'
                : 'text-m3-on-surface-variant hover:text-m3-on-surface'
            }`}
          >
            Card Payment
          </button>
        </div>

        {/* Credit Card Selector */}
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

        {/* Amount Input + Quick-fill actions for Payments */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="tx-amount-input" className="text-sm font-medium text-m3-on-surface">
              Amount
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
                  selectedCardSummary.currentOutstanding !== selectedCardSummary.upcomingBillAmount && (
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
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder={
                type === 'payment' ? 'e.g., NEFT Bill Settlement' : 'e.g., Groceries, Fuel, Dining'
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

        {/* Payment-specific options */}
        {type === 'payment' && (
          <div className="space-y-3">
            {unpaidStatements.length > 0 && (
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
                  {unpaidStatements.map((stmt) => (
                    <option key={stmt.cycleKey} value={stmt.cycleKey}>
                      Statement {formatShortDate(stmt.statementDate)} — Due{' '}
                      {formatShortDate(stmt.dueDate)} ({formatMoney(stmt.remainingAmount, currency)}{' '}
                      left)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deductFromBank}
                onChange={(e) => setDeductFromBank(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-m3-outline accent-m3-primary shrink-0"
              />
              <div className="text-sm min-w-0">
                <p className="font-medium text-m3-on-surface">
                  Also deduct from Bank Balance
                </p>
                <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                  {deductFromBank && amountValid ? (
                    <>
                      Bank balance updates to{' '}
                      <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                        {formatMoney(projectedBankAfterPayment, currency)}
                      </span>
                    </>
                  ) : (
                    'Uncheck if you already updated your bank balance manually.'
                  )}
                </p>
              </div>
            </label>
          </div>
        )}

        {error && <p className="text-xs text-m3-error">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-full text-sm font-medium text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-6 rounded-full bg-m3-primary text-m3-on-primary text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving
              ? 'Saving...'
              : editingTransaction
                ? 'Save Changes'
                : type === 'payment'
                  ? 'Record Payment'
                  : 'Add Spending'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
