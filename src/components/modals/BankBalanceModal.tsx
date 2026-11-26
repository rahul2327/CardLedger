import React, {useEffect, useState} from 'react';
import type {CurrencyCode} from '../../types/finance';
import {roundMoney} from '../../utils/financeEngine';
import {formatMoney, getCurrencySymbol} from '../../utils/formatters';
import {DialogShell} from '../ui/DialogShell';

interface BankBalanceModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  currentBankName: string;
  totalCCOutstanding: number;
  currency: CurrencyCode;
  onSave: (balance: number, bankName: string) => Promise<void>;
}

export const BankBalanceModal: React.FC<BankBalanceModalProps> = ({
  open,
  onClose,
  currentBalance,
  currentBankName,
  totalCCOutstanding,
  currency,
  onSave,
}) => {
  const [amountInput, setAmountInput] = useState('');
  const [bankName, setBankName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountInput(currentBalance === 0 ? '' : String(currentBalance));
      setBankName(currentBankName);
      setError(null);
      setSaving(false);
    }
  }, [open, currentBalance, currentBankName]);

  const parsedValue = amountInput.trim() === '' ? 0 : Number(amountInput);
  const isValidNumber = Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 999_999_999.99;
  const projectedRemaining = isValidNumber
    ? roundMoney(parsedValue - totalCCOutstanding)
    : roundMoney(currentBalance - totalCCOutstanding);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = amountInput.trim();
    if (raw === '') {
      setError('Please enter your current bank balance (enter 0 if empty).');
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      setError('Bank balance must be zero or a positive number.');
      return;
    }
    if (num > 999_999_999.99) {
      setError('Amount exceeds the supported maximum limit.');
      return;
    }
    setSaving(true);
    try {
      await onSave(roundMoney(num), bankName.trim() || 'Primary Bank Account');
      onClose();
    } catch {
      setError('Unable to save bank balance locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Update Bank Balance"
      subtitle="Stored locally on this device. Used to calculate your remaining cash after credit card dues."
      maxWidthClass="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="bank-name-input"
            className="block text-sm font-medium text-m3-on-surface mb-1.5"
          >
            Account Label
          </label>
          <input
            id="bank-name-input"
            type="text"
            maxLength={60}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., HDFC Savings Account"
            className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="bank-balance-input"
            className="block text-sm font-medium text-m3-on-surface mb-1.5"
          >
            Current Available Balance
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-mono text-m3-on-surface-variant">
              {symbol}
            </span>
            <input
              id="bank-balance-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
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
          {error && <p className="mt-1.5 text-xs text-m3-error">{error}</p>}
        </div>

        <div className="rounded-2xl bg-m3-surface-low p-4 space-y-2 border border-m3-outline-variant/60">
          <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
            <span>Total CC Outstanding</span>
            <span className="font-mono tabular-nums">
              {formatMoney(totalCCOutstanding, currency)}
            </span>
          </div>
          <div className="h-px bg-m3-outline-variant/60" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-m3-on-surface">Balance After Paying Cards</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                projectedRemaining < 0 ? 'text-m3-error' : 'text-m3-primary'
              }`}
            >
              {formatMoney(projectedRemaining, currency)}
            </span>
          </div>
        </div>

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
            {saving ? 'Saving...' : 'Save Balance'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
