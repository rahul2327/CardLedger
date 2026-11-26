import React, {useEffect, useMemo, useState} from 'react';
import type {CardColorToken, CreditCard, CurrencyCode} from '../../types/finance';
import type {CardInput} from '../../hooks/useFinanceStore';
import {previewCardSchedule} from '../../utils/financeEngine';
import {
  CARD_COLOR_TOKENS,
  formatShortDate,
  getCurrencySymbol,
} from '../../utils/formatters';
import {DialogShell} from '../ui/DialogShell';

interface CardFormModalProps {
  open: boolean;
  onClose: () => void;
  editingCard?: CreditCard | null;
  currency: CurrencyCode;
  todayDate: string;
  onSave: (input: CardInput) => Promise<void>;
}

const COLOR_KEYS: CardColorToken[] = ['teal', 'indigo', 'emerald', 'amber', 'rose', 'slate'];

export const CardFormModal: React.FC<CardFormModalProps> = ({
  open,
  onClose,
  editingCard,
  currency,
  todayDate,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [billingDay, setBillingDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [colorToken, setColorToken] = useState<CardColorToken>('teal');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCard) {
      setName(editingCard.name);
      setLastFour(editingCard.lastFour);
      setLimitInput(editingCard.limit !== null ? String(editingCard.limit) : '');
      setBillingDay(String(editingCard.billingDay));
      setDueDay(String(editingCard.dueDay));
      setColorToken(editingCard.colorToken);
    } else {
      setName('');
      setLastFour('');
      setLimitInput('');
      setBillingDay('15');
      setDueDay('5');
      setColorToken('teal');
    }
    setError(null);
    setSaving(false);
  }, [open, editingCard]);

  const parsedBillingDay = Number(billingDay);
  const parsedDueDay = Number(dueDay);
  const daysValid =
    Number.isInteger(parsedBillingDay) &&
    parsedBillingDay >= 1 &&
    parsedBillingDay <= 31 &&
    Number.isInteger(parsedDueDay) &&
    parsedDueDay >= 1 &&
    parsedDueDay <= 31;

  const schedulePreview = useMemo(() => {
    if (!daysValid) return null;
    return previewCardSchedule(parsedBillingDay, parsedDueDay, todayDate);
  }, [daysValid, parsedBillingDay, parsedDueDay, todayDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a credit card name (e.g., Axis, Kiwi, HDFC).');
      return;
    }

    let parsedLimit: number | null = null;
    if (limitInput.trim() !== '') {
      const n = Number(limitInput);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Card limit must be a positive number, or leave blank if not set.');
        return;
      }
      if (n > 999_999_999.99) {
        setError('Card limit exceeds the maximum supported value.');
        return;
      }
      parsedLimit = n;
    }

    if (!Number.isInteger(parsedBillingDay) || parsedBillingDay < 1 || parsedBillingDay > 31) {
      setError('Billing date must be a whole day between 1 and 31.');
      return;
    }

    if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setError('Payment due date must be a whole day between 1 and 31.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingCard?.id,
        name: trimmedName,
        lastFour: lastFour.replace(/\D/g, '').slice(0, 4),
        limit: parsedLimit,
        billingDay: parsedBillingDay,
        dueDay: parsedDueDay,
        colorToken,
      });
      onClose();
    } catch {
      setError('Could not save credit card locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
      subtitle="Configure billing and due dates to track statements and current-cycle spending automatically."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="card-name-input"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Card Name
            </label>
            <input
              id="card-name-input"
              type="text"
              maxLength={60}
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., Axis Ace, Kiwi RuPay, HDFC"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="card-last4-input"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Last 4 Digits <span className="text-m3-on-surface-variant font-normal">(Opt.)</span>
            </label>
            <input
              id="card-last4-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4821"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="card-limit-input"
            className="block text-sm font-medium text-m3-on-surface mb-1.5"
          >
            Credit Limit <span className="text-m3-on-surface-variant font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono text-m3-on-surface-variant">
              {symbol}
            </span>
            <input
              id="card-limit-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={limitInput}
              onChange={(e) => {
                setLimitInput(e.target.value);
                setError(null);
              }}
              placeholder="Leave blank if not tracked"
              className="w-full min-h-[48px] pl-9 pr-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums placeholder:font-sans placeholder:text-m3-on-surface-variant/60 text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="card-billing-day"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Billing Day (1–31)
            </label>
            <input
              id="card-billing-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={billingDay}
              onChange={(e) => {
                setBillingDay(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="card-due-day"
              className="block text-sm font-medium text-m3-on-surface mb-1.5"
            >
              Payment Due Day (1–31)
            </label>
            <input
              id="card-due-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => {
                setDueDay(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-m3-surface-low border border-m3-outline-variant text-m3-on-surface font-mono tabular-nums text-sm focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {schedulePreview && (
          <div className="rounded-2xl bg-m3-surface-low p-4 border border-m3-outline-variant/60 space-y-2 text-xs">
            <p className="font-medium text-m3-on-surface">Cycle Schedule Preview</p>
            <div className="flex items-center justify-between gap-2 text-m3-on-surface-variant">
              <span>Current unbilled cycle</span>
              <span className="font-mono tabular-nums text-m3-on-surface">
                {formatShortDate(schedulePreview.currentCycleStart)} –{' '}
                {formatShortDate(schedulePreview.nextStatementDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-m3-on-surface-variant">
              <span>Next statement generates</span>
              <span className="font-mono tabular-nums text-m3-on-surface">
                {formatShortDate(schedulePreview.nextStatementDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-m3-on-surface-variant">
              <span>Latest statement due date</span>
              <span className="font-mono tabular-nums text-m3-on-surface">
                {formatShortDate(schedulePreview.latestStatementDueDate)}
              </span>
            </div>
          </div>
        )}

        <div>
          <span className="block text-sm font-medium text-m3-on-surface mb-2">Card Accent</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_KEYS.map((key) => {
              const token = CARD_COLOR_TOKENS[key];
              const active = colorToken === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColorToken(key)}
                  aria-label={`Select ${token.label} color`}
                  aria-pressed={active}
                  className={`min-h-[40px] px-3 rounded-full flex items-center gap-2 text-xs font-medium border transition-colors ${
                    active
                      ? 'border-m3-primary bg-m3-primary-container/50 text-m3-on-surface'
                      : 'border-m3-outline-variant bg-m3-surface-low text-m3-on-surface-variant hover:bg-m3-surface-high'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${token.swatch}`} />
                  <span>{token.label}</span>
                </button>
              );
            })}
          </div>
        </div>

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
            {saving ? 'Saving...' : editingCard ? 'Save Changes' : 'Add Card'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
