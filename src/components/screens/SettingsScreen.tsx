import React, {useRef, useState} from 'react';
import {
  Download,
  HardDrive,
  Landmark,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {buildBackupPayload, validateBackupPayload} from '../../db/indexedDb';
import type {
  AppSettings,
  BackupPayload,
  CreditCard,
  CurrencyCode,
  ThemeMode,
  Transaction,
} from '../../types/finance';
import {getTodayDateString} from '../../utils/financeEngine';
import {CURRENCY_OPTIONS, formatMoney} from '../../utils/formatters';
import {ConfirmDialog} from '../ui/DialogShell';

interface SettingsScreenProps {
  settings: AppSettings;
  cards: CreditCard[];
  transactions: Transaction[];
  onUpdateTheme: (theme: ThemeMode) => Promise<void>;
  onUpdateCurrency: (currency: CurrencyCode) => Promise<void>;
  onEditBankBalance: () => void;
  onRestoreBackup: (payload: BackupPayload) => Promise<void>;
  onLoadSampleData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
  onNotify: (message: string) => void;
}

const THEME_OPTIONS: Array<{value: ThemeMode; label: string; icon: React.ReactNode}> = [
  {value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" />},
  {value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" />},
  {value: 'system', label: 'System Default', icon: <Monitor className="w-4 h-4" />},
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  cards,
  transactions,
  onUpdateTheme,
  onUpdateCurrency,
  onEditBankBalance,
  onRestoreBackup,
  onLoadSampleData,
  onClearAllData,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmSampleOpen, setConfirmSampleOpen] = useState(false);

  const handleExportJson = () => {
    const payload = buildBackupPayload(settings, cards, transactions);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardledger-backup-${getTodayDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('JSON backup downloaded locally.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = validateBackupPayload(parsed);
      if (result.valid === false) {
        setImportError(result.error);
        return;
      }
      setPendingRestore(result.payload);
    } catch {
      setImportError('Could not parse JSON file. Please select a valid CardLedger backup file.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    await onRestoreBackup(pendingRestore);
    setPendingRestore(null);
    onNotify('Backup restored to local storage.');
  };

  const handleSampleAction = async () => {
    if (cards.length > 0 || transactions.length > 0 || settings.bankBalance > 0) {
      setConfirmSampleOpen(true);
      return;
    }
    await onLoadSampleData();
    onNotify('Sample cards and transactions loaded.');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Appearance & Theme */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-m3-on-surface">Appearance</h2>
          <p className="text-xs text-m3-on-surface-variant">
            Choose Light Mode, Dark Mode, or match your device theme automatically
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/60"
          role="radiogroup"
          aria-label="Theme preference"
        >
          {THEME_OPTIONS.map((opt) => {
            const active = settings.theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onUpdateTheme(opt.value)}
                className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-m3-primary text-m3-on-primary shadow-xs'
                    : 'text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-high/60'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bank Account & Currency */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 divide-y divide-m3-outline-variant/50 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-m3-on-surface">Bank Account</h2>
            <p className="mt-0.5 text-xs text-m3-on-surface-variant">
              {settings.bankName} · Current balance{' '}
              <span className="font-mono tabular-nums font-medium text-m3-on-surface">
                {formatMoney(settings.bankBalance, settings.currency)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onEditBankBalance}
            className="min-h-[44px] px-5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Landmark className="w-4 h-4" />
            <span>Update Balance</span>
          </button>
        </div>

        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label htmlFor="currency-select" className="text-base font-semibold text-m3-on-surface">
              Display Currency
            </label>
            <p className="mt-0.5 text-xs text-m3-on-surface-variant">
              Formats all balances, card limits, and statements offline
            </p>
          </div>
          <select
            id="currency-select"
            value={settings.currency}
            onChange={(e) => onUpdateCurrency(e.target.value as CurrencyCode)}
            className="min-h-[44px] px-4 rounded-full bg-m3-surface-low border border-m3-outline-variant text-sm text-m3-on-surface focus:border-m3-primary focus:outline-none"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Local Backup & Restore (JSON) */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-m3-on-surface">
              Local Backup &amp; Restore
            </h2>
            <p className="mt-0.5 text-xs text-m3-on-surface-variant leading-relaxed">
              Export your complete database as a JSON file to keep an offline copy, or restore a
              previously saved backup. No financial data ever leaves your device.
            </p>
          </div>
          <HardDrive className="w-5 h-5 text-m3-on-surface-variant shrink-0" />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportJson}
            className="min-h-[44px] px-5 rounded-full bg-m3-primary text-m3-on-primary text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Restore JSON Backup</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {importError && <p className="text-xs text-m3-error">{importError}</p>}

        <p className="text-xs text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/50">
          Stored locally in IndexedDB · {cards.length} {cards.length === 1 ? 'card' : 'cards'} ·{' '}
          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
        </p>
      </section>

      {/* Data Utilities */}
      <section className="rounded-[24px] bg-m3-surface-lowest dark:bg-m3-surface-container border border-m3-outline-variant/60 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-m3-on-surface">Device &amp; Data Tools</h2>
          <p className="mt-0.5 text-xs text-m3-on-surface-variant">
            Load sample cards or reset your local device ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <button
            type="button"
            onClick={handleSampleAction}
            className="min-h-[44px] px-5 rounded-full border border-m3-outline-variant text-m3-on-surface text-sm font-medium inline-flex items-center gap-2 hover:bg-m3-surface-low transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-m3-primary" />
            <span>Load Sample Data</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="min-h-[44px] px-5 rounded-full border border-m3-error/40 text-m3-error text-sm font-medium inline-flex items-center gap-2 hover:bg-m3-error-container/50 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Data</span>
          </button>
        </div>
      </section>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Local Backup?"
        message={
          pendingRestore
            ? `This will replace your current local data with the backup containing ${formatMoney(
                pendingRestore.settings.bankBalance,
                pendingRestore.settings.currency
              )} bank balance, ${pendingRestore.cards.length} credit cards, and ${
                pendingRestore.transactions.length
              } transactions.`
            : ''
        }
        confirmLabel="Restore Backup"
        destructive={false}
      />

      {/* Sample Data Overwrite Confirmation */}
      <ConfirmDialog
        open={confirmSampleOpen}
        onClose={() => setConfirmSampleOpen(false)}
        onConfirm={async () => {
          setConfirmSampleOpen(false);
          await onLoadSampleData();
          onNotify('Sample dataset loaded locally.');
        }}
        title="Replace With Sample Data?"
        message="Loading the sample dataset (Axis Ace, Kiwi RuPay, and HDFC Millennia) will replace your current locally stored cards, transactions, and bank balance. Export a JSON backup first if you want to keep existing data."
        confirmLabel="Load Sample Data"
        destructive={false}
      />

      {/* Clear All Data Confirmation */}
      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setConfirmClearOpen(false);
          await onClearAllData();
          onNotify('All local data cleared.');
        }}
        title="Clear All Local Data?"
        message="This permanently removes your bank balance, all credit cards, and every transaction from IndexedDB on this device. This action cannot be undone unless you have exported a JSON backup."
        confirmLabel="Clear Everything"
        destructive={true}
      />
    </div>
  );
};
