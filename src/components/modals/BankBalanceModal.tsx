import React, {useEffect, useMemo, useState} from 'react';
import {Landmark, Pencil, Plus, Trash2, X} from 'lucide-react';
import type {BankAccountInput} from '../../hooks/useFinanceStore';
import type {BankAccount, CurrencyCode} from '../../types/finance';
import {roundMoney} from '../../utils/financeEngine';
import {formatMoney, getCurrencySymbol} from '../../utils/formatters';
import {DialogShell} from '../ui/DialogShell';

interface BankBalanceModalProps {
  open: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  totalCCOutstanding: number;
  currency: CurrencyCode;
  onSaveAccount: (input: BankAccountInput) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
}

type FormMode = 'closed' | 'add' | 'edit';

export const BankBalanceModal: React.FC<BankBalanceModalProps> = ({
  open,
  onClose,
  bankAccounts,
  totalCCOutstanding,
  currency,
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setError(null);
    setSaving(false);
    setConfirmDeleteId(null);

    if (bankAccounts.length === 0) {
      setFormMode('add');
      setEditingId(null);
      setBankName('');
      setAmountInput('');
    } else if (bankAccounts.length === 1) {
      // Fast path for single-account users: pre-open edit on their account while still showing "+ Add Bank Account"
      const only = bankAccounts[0];
      setFormMode('edit');
      setEditingId(only.id);
      setBankName(only.name);
      setAmountInput(only.balance === 0 ? '' : String(only.balance));
    } else {
      setFormMode('closed');
      setEditingId(null);
      setBankName('');
      setAmountInput('');
    }
  }, [open, bankAccounts]);

  const openAddForm = () => {
    setConfirmDeleteId(null);
    setFormMode('add');
    setEditingId(null);
    setBankName('');
    setAmountInput('');
    setError(null);
  };

  const openEditForm = (account: BankAccount) => {
    setConfirmDeleteId(null);
    setFormMode('edit');
    setEditingId(account.id);
    setBankName(account.name);
    setAmountInput(String(account.balance));
    setError(null);
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingId(null);
    setBankName('');
    setAmountInput('');
    setError(null);
  };

  const currentTotalBank = useMemo(
    () => roundMoney(bankAccounts.reduce((acc, item) => acc + item.balance, 0)),
    [bankAccounts]
  );

  // Live preview of combined total bank balance while adding or editing an account
  const projectedTotalBank = useMemo(() => {
    if (formMode === 'closed') return currentTotalBank;
    const raw = amountInput.trim();
    const parsed = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 999_999_999.99) {
      return currentTotalBank;
    }
    if (formMode === 'add') {
      return roundMoney(currentTotalBank + parsed);
    }
    const prev = bankAccounts.find((a) => a.id === editingId)?.balance ?? 0;
    return roundMoney(currentTotalBank - prev + parsed);
  }, [formMode, amountInput, currentTotalBank, bankAccounts, editingId]);

  const projectedRemaining = roundMoney(projectedTotalBank - totalCCOutstanding);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = bankName.trim();
    if (!trimmedName) {
      setError('Please enter a bank account name (e.g., HDFC Savings).');
      return;
    }

    const raw = amountInput.trim();
    if (raw === '') {
      setError('Please enter the current balance (enter 0 if empty).');
      return;
    }

    const num = Number(raw);
    if (!Number.isFinite(num)) {
      setError('Please enter a valid number.');
      return;
    }
    if (Math.abs(num) > 999_999_999.99) {
      setError('Amount exceeds the supported maximum limit.');
      return;
    }

    setSaving(true);
    try {
      await onSaveAccount({
        id: formMode === 'edit' && editingId ? editingId : undefined,
        name: trimmedName,
        balance: roundMoney(num),
      });
      closeForm();
    } catch {
      setError('Unable to save bank account locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (accountId: string) => {
    setSaving(true);
    try {
      await onDeleteAccount(accountId);
      if (editingId === accountId) {
        closeForm();
      }
      setConfirmDeleteId(null);
    } catch {
      setError('Unable to remove bank account locally.');
    } finally {
      setSaving(false);
    }
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Bank Accounts"
      subtitle="Add multiple bank accounts. Their combined balance calculates your remaining cash after card dues."
      maxWidthClass="sm:max-w-lg"
    >
      <div className="space-y-4">
        {/* Live Combined Summary */}
        <div className="rounded-2xl bg-m3-surface-low p-4 space-y-2 border border-m3-outline-variant/60">
          <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
            <span>
              Total Bank Balance ({bankAccounts.length}{' '}
              {bankAccounts.length === 1 ? 'account' : 'accounts'})
            </span>
            <span className="font-mono tabular-nums font-medium text-m3-on-surface">
              {formatMoney(projectedTotalBank, currency)}
            </span>
          </div>
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

        {/* Existing Bank Accounts List */}
        {bankAccounts.length > 0 && (
          <div className="rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60 divide-y divide-m3-outline-variant/50 overflow-hidden">
            {bankAccounts.map((acc) => {
              const isEditingThis = formMode === 'edit' && editingId === acc.id;
              const isDeletingThis = confirmDeleteId === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`px-4 py-3 transition-colors ${
                    isEditingThis ? 'bg-m3-secondary-container/25' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-m3-surface-high text-m3-primary flex items-center justify-center shrink-0">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-m3-on-surface truncate">
                          {acc.name}
                        </p>
                        <p
                          className={`text-xs font-mono tabular-nums font-semibold ${
                            acc.balance < 0 ? 'text-m3-error' : 'text-m3-on-surface-variant'
                          }`}
                        >
                          {formatMoney(acc.balance, currency)}
                        </p>
                      </div>
                    </div>

                    {isDeletingThis ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-8 px-2.5 rounded-full text-xs font-medium text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleConfirmDelete(acc.id)}
                          className="h-8 px-3 rounded-full bg-m3-error text-m3-on-error text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditForm(acc)}
                          aria-label={`Edit ${acc.name}`}
                          className="h-9 w-9 rounded-full text-m3-on-surface-variant hover:bg-m3-surface-high hover:text-m3-on-surface flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(acc.id)}
                          aria-label={`Remove ${acc.name}`}
                          className="h-9 w-9 rounded-full text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Bank Account Form */}
        {formMode !== 'closed' ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-m3-surface-low border border-m3-primary/35 p-4 space-y-3.5"
            noValidate
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-m3-on-surface">
                {formMode === 'edit' ? 'Edit Bank Account' : 'Add Bank Account'}
              </p>
              {bankAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close account form"
                  className="h-7 w-7 rounded-full text-m3-on-surface-variant hover:bg-m3-surface-high flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="bank-name-input"
                className="block text-xs font-medium text-m3-on-surface-variant mb-1.5"
              >
                Account Label
              </label>
              <input
                id="bank-name-input"
                type="text"
                maxLength={60}
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., HDFC Savings, SBI Salary"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-m3-surface border border-m3-outline-variant text-m3-on-surface placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="bank-balance-input"
                className="block text-xs font-medium text-m3-on-surface-variant mb-1.5"
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
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl bg-m3-surface border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums text-base font-medium focus:border-m3-primary focus:outline-none transition-colors"
                />
              </div>
              {error && <p className="mt-1.5 text-xs text-m3-error">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {bankAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-9 px-3.5 rounded-full text-[13px] font-medium text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 rounded-full bg-m3-primary text-m3-on-primary text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving
                  ? 'Saving...'
                  : formMode === 'edit'
                    ? 'Save Account'
                    : 'Add Account'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2.5 pt-1">
          {formMode !== 'add' ? (
            <button
              type="button"
              onClick={openAddForm}
              className="h-10 px-4 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-[13px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Bank Account</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-full bg-m3-surface-high text-m3-on-surface text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </DialogShell>
  );
};
