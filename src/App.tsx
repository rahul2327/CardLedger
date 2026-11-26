import React, {useCallback, useEffect, useState} from 'react';
import {
  CreditCard as CreditCardIcon,
  History,
  LayoutDashboard,
  Monitor,
  Moon,
  Plus,
  ReceiptText,
  Settings,
  Sun,
  WifiOff,
} from 'lucide-react';
import {BankBalanceModal} from './components/modals/BankBalanceModal';
import {CardFormModal} from './components/modals/CardFormModal';
import {
  TransactionFormModal,
  type TransactionModalPreset,
} from './components/modals/TransactionFormModal';
import {BillsScreen} from './components/screens/BillsScreen';
import {CardsScreen} from './components/screens/CardsScreen';
import {DashboardScreen} from './components/screens/DashboardScreen';
import {HistoryScreen} from './components/screens/HistoryScreen';
import {SettingsScreen} from './components/screens/SettingsScreen';
import {ConfirmDialog} from './components/ui/DialogShell';
import {PWAInstallButton} from './components/ui/PWAInstallButton';
import {useFinanceStore} from './hooks/useFinanceStore';
import {useOnlineStatus} from './hooks/usePWAInstall';
import {useThemeEffect} from './hooks/useTheme';
import type {CreditCard, NavTab, ThemeMode, Transaction} from './types/finance';
import {formatMoney, formatShortDate} from './utils/formatters';

const NAV_ITEMS: Array<{id: NavTab; label: string; icon: React.ComponentType<{className?: string}>}> = [
  {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
  {id: 'cards', label: 'Cards', icon: CreditCardIcon},
  {id: 'bills', label: 'Bills', icon: ReceiptText},
  {id: 'history', label: 'History', icon: History},
  {id: 'settings', label: 'Settings', icon: Settings},
];

const PAGE_TITLES: Record<NavTab, {title: string; subtitle: string}> = {
  dashboard: {
    title: 'Overview',
    subtitle: 'Bank balance, credit card dues, and upcoming bills',
  },
  cards: {
    title: 'Credit Cards',
    subtitle: 'Card limits, billing cycles, and per-card spending',
  },
  bills: {
    title: 'Bills & Cycles',
    subtitle: 'Generated statements and current unbilled activity',
  },
  history: {
    title: 'Transactions',
    subtitle: 'Search, filter, and manage every card entry',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Theme, currency, local JSON backup, and offline storage',
  },
};

const THEME_QUICK_OPTIONS: Array<{value: ThemeMode; label: string; icon: React.ComponentType<{className?: string}>}> = [
  {value: 'light', label: 'Light theme', icon: Sun},
  {value: 'dark', label: 'Dark theme', icon: Moon},
  {value: 'system', label: 'System theme', icon: Monitor},
];

export default function App() {
  const store = useFinanceStore();
  const isOnline = useOnlineStatus();
  useThemeEffect(store.settings.theme);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Modals
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txPreset, setTxPreset] = useState<TransactionModalPreset | null>(null);

  // Delete confirmations
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [refundBankOnDelete, setRefundBankOnDelete] = useState(true);

  // Material 3 Snackbar
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const openAddCard = useCallback(() => {
    setEditingCard(null);
    setCardModalOpen(true);
  }, []);

  const openEditCard = useCallback((card: CreditCard) => {
    setEditingCard(card);
    setCardModalOpen(true);
  }, []);

  const openTransactionModal = useCallback(
    (preset?: TransactionModalPreset) => {
      if (store.cards.length === 0) {
        notify('Add a credit card first to log spending or payments.');
        openAddCard();
        return;
      }
      setEditingTx(null);
      setTxPreset(preset ?? {type: 'spend'});
      setTxModalOpen(true);
    },
    [store.cards.length, notify, openAddCard]
  );

  const openEditTransaction = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setTxPreset(null);
    setTxModalOpen(true);
  }, []);

  const requestDeleteTransaction = useCallback((tx: Transaction) => {
    setRefundBankOnDelete(Boolean(tx.type === 'payment' && tx.deductFromBank));
    setTxToDelete(tx);
  }, []);

  const handleConfirmDeleteCard = async () => {
    if (!cardToDelete) return;
    const name = cardToDelete.name;
    const id = cardToDelete.id;
    await store.deleteCard(id);
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
    setCardToDelete(null);
    notify(`Deleted ${name} and its transactions.`);
  };

  const handleConfirmDeleteTx = async () => {
    if (!txToDelete) return;
    const isPayment = txToDelete.type === 'payment';
    await store.deleteTransaction(txToDelete.id, refundBankOnDelete);
    setTxToDelete(null);
    notify(isPayment ? 'Payment deleted.' : 'Spending entry deleted.');
  };

  const handleSelectCardDetail = (cardId: string) => {
    setSelectedCardId(cardId);
    setActiveTab('cards');
  };

  const cardTxCountToDelete = cardToDelete
    ? store.transactions.filter((t) => t.cardId === cardToDelete.id).length
    : 0;

  const pageMeta = PAGE_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-m3-surface text-m3-on-surface flex flex-col md:flex-row">
      {/* Desktop Material 3 Navigation Drawer */}
      <aside className="hidden md:flex md:flex-col md:w-64 lg:w-68 shrink-0 bg-m3-surface-low border-r border-m3-outline-variant/60 sticky top-0 h-screen p-4 justify-between">
        <div className="space-y-6">
          {/* Brand Wordmark */}
          <div className="px-3 pt-2 flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="CardLedger logo"
              className="w-8 h-8 rounded-xl shrink-0"
            />
            <span className="font-display text-lg font-bold tracking-tight text-m3-on-surface whitespace-nowrap">
              CardLedger
            </span>
          </div>

          {/* Primary Extended FAB */}
          <button
            type="button"
            onClick={() =>
              store.cards.length === 0 ? openAddCard() : openTransactionModal({type: 'spend'})
            }
            className="w-full min-h-[52px] px-5 rounded-2xl bg-m3-primary-container text-m3-on-primary-container font-medium text-sm inline-flex items-center justify-center gap-2.5 shadow-xs hover:opacity-95 active:scale-[0.99] transition-all whitespace-nowrap"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>{store.cards.length === 0 ? 'Add Credit Card' : 'Add Spending'}</span>
          </button>

          {/* Navigation Destinations */}
          <nav aria-label="Main navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[48px] px-4 rounded-full flex items-center gap-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-m3-secondary-container text-m3-on-secondary-container font-semibold'
                      : 'text-m3-on-surface-variant hover:bg-m3-surface-high/60 hover:text-m3-on-surface'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                  {item.id === 'bills' && store.summary.upcomingDueBills.length > 0 && (
                    <span className="ml-auto font-mono tabular-nums text-xs text-m3-tertiary font-semibold">
                      {store.summary.upcomingDueBills.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Drawer Utilities: Compact Theme Switcher & Offline Install */}
        <div className="space-y-3 pt-4 border-t border-m3-outline-variant/50">
          <PWAInstallButton compact />

          <div
            className="grid grid-cols-3 p-1 rounded-full bg-m3-surface-container border border-m3-outline-variant/60"
            role="radiogroup"
            aria-label="Quick theme switcher"
          >
            {THEME_QUICK_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = store.settings.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={opt.label}
                  title={opt.label}
                  onClick={() => store.updateTheme(opt.value)}
                  className={`min-h-[36px] rounded-full flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-m3-primary text-m3-on-primary'
                      : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Offline Mode Notice (only visible when actually offline) */}
        {!isOnline && (
          <div className="bg-m3-tertiary-container text-m3-on-tertiary-container px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Working offline — all changes are saved locally on this device.</span>
          </div>
        )}

        {/* Top Page Header (Non-sticky on mobile to keep fixed surfaces well below 15% cap) */}
        <header className="px-4 sm:px-6 lg:px-8 pt-5 pb-4 flex items-center justify-between gap-4 max-w-7xl w-full mx-auto">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 md:hidden mb-1">
              <img
                src="/icon.svg"
                alt="CardLedger logo"
                className="w-6 h-6 rounded-lg shrink-0"
              />
              <span className="font-display text-sm font-bold tracking-tight text-m3-primary">
                CardLedger
              </span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-m3-on-surface truncate">
              {pageMeta.title}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-m3-on-surface-variant truncate">
              {pageMeta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Mobile Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                const order: ThemeMode[] = ['light', 'dark', 'system'];
                const next = order[(order.indexOf(store.settings.theme) + 1) % order.length];
                store.updateTheme(next);
                notify(
                  next === 'system'
                    ? 'Theme set to System Default.'
                    : `Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode.`
                );
              }}
              aria-label="Switch color theme"
              title={`Theme: ${store.settings.theme}`}
              className="md:hidden min-h-[44px] min-w-[44px] rounded-full bg-m3-surface-low border border-m3-outline-variant/70 text-m3-on-surface-variant flex items-center justify-center hover:bg-m3-surface-high transition-colors"
            >
              {store.settings.theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : store.settings.theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>

            {/* Desktop Secondary Quick Action: Record Payment */}
            {store.cards.length > 0 && (
              <button
                type="button"
                onClick={() => openTransactionModal({type: 'payment'})}
                className="hidden sm:inline-flex min-h-[44px] px-4 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-medium items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <span>Record Payment</span>
              </button>
            )}

            {/* Desktop Primary Quick-Add Spending CTA (for quick access from top bar too) */}
            <button
              type="button"
              onClick={() =>
                store.cards.length === 0 ? openAddCard() : openTransactionModal({type: 'spend'})
              }
              className="hidden sm:inline-flex md:hidden min-h-[44px] px-4 rounded-full bg-m3-primary text-m3-on-primary text-xs font-medium items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{store.cards.length === 0 ? 'Add Card' : 'Add Spend'}</span>
            </button>
          </div>
        </header>

        {/* Active Screen Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-28 md:pb-10 max-w-7xl w-full mx-auto">
          {store.storageError && (
            <div className="mb-6 rounded-2xl bg-m3-error-container text-m3-on-error-container p-4 text-sm">
              {store.storageError}
            </div>
          )}

          {store.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-36 rounded-[24px] bg-m3-surface-container border border-m3-outline-variant/40"
                />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardScreen
                  settings={store.settings}
                  summary={store.summary}
                  transactions={store.transactions}
                  onNavigate={setActiveTab}
                  onSelectCardDetail={handleSelectCardDetail}
                  onEditBankBalance={() => setBankModalOpen(true)}
                  onAddCard={openAddCard}
                  onOpenTransactionModal={openTransactionModal}
                  onEditTransaction={openEditTransaction}
                  onDeleteTransaction={requestDeleteTransaction}
                  onLoadSampleData={async () => {
                    await store.loadSampleData();
                    notify('Sample cards and transactions loaded.');
                  }}
                />
              )}

              {activeTab === 'cards' && (
                <CardsScreen
                  cardSummaries={store.summary.cardSummaries}
                  transactions={store.transactions}
                  selectedCardId={selectedCardId}
                  currency={store.settings.currency}
                  onSelectCard={setSelectedCardId}
                  onAddCard={openAddCard}
                  onEditCard={openEditCard}
                  onDeleteCard={setCardToDelete}
                  onOpenTransactionModal={openTransactionModal}
                  onEditTransaction={openEditTransaction}
                  onDeleteTransaction={requestDeleteTransaction}
                />
              )}

              {activeTab === 'bills' && (
                <BillsScreen
                  summary={store.summary}
                  currency={store.settings.currency}
                  todayDate={store.todayDate}
                  onAddCard={openAddCard}
                  onOpenTransactionModal={openTransactionModal}
                />
              )}

              {activeTab === 'history' && (
                <HistoryScreen
                  cards={store.cards}
                  transactions={store.transactions}
                  currency={store.settings.currency}
                  todayDate={store.todayDate}
                  onOpenTransactionModal={openTransactionModal}
                  onEditTransaction={openEditTransaction}
                  onDeleteTransaction={requestDeleteTransaction}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsScreen
                  settings={store.settings}
                  cards={store.cards}
                  transactions={store.transactions}
                  onUpdateTheme={async (theme) => {
                    await store.updateTheme(theme);
                    notify(
                      theme === 'system'
                        ? 'Theme set to System Default.'
                        : `Switched to ${theme === 'dark' ? 'Dark' : 'Light'} Mode.`
                    );
                  }}
                  onUpdateCurrency={async (currency) => {
                    await store.updateCurrency(currency);
                    notify(`Currency updated to ${currency}.`);
                  }}
                  onEditBankBalance={() => setBankModalOpen(true)}
                  onRestoreBackup={store.restoreBackup}
                  onLoadSampleData={store.loadSampleData}
                  onClearAllData={store.clearAllData}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Material 3 Floating Action Button */}
      <button
        type="button"
        onClick={() =>
          store.cards.length === 0 ? openAddCard() : openTransactionModal({type: 'spend'})
        }
        aria-label={store.cards.length === 0 ? 'Add credit card' : 'Add spending'}
        className="md:hidden fixed right-4 bottom-20 z-30 h-14 px-4 rounded-2xl bg-m3-primary text-m3-on-primary shadow-lg inline-flex items-center gap-2 font-medium text-sm active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        <span>{store.cards.length === 0 ? 'Add Card' : 'Add Spend'}</span>
      </button>

      {/* Mobile Material 3 Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-m3-surface-low/95 backdrop-blur-md border-t border-m3-outline-variant/60 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <span
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                      : 'text-m3-on-surface-variant'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className={`text-[11px] leading-none tracking-tight ${
                    isActive
                      ? 'font-semibold text-m3-on-surface'
                      : 'font-medium text-m3-on-surface-variant'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Material 3 Snackbar Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-50 px-5 py-3 rounded-2xl bg-m3-on-surface text-m3-surface text-sm font-medium shadow-xl max-w-[90vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      {/* Bank Balance Dialog */}
      <BankBalanceModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        currentBalance={store.settings.bankBalance}
        currentBankName={store.settings.bankName}
        totalCCOutstanding={store.summary.totalCCOutstanding}
        currency={store.settings.currency}
        onSave={async (balance, bankName) => {
          await store.updateBankBalance(balance, bankName);
          notify('Bank balance updated.');
        }}
      />

      {/* Credit Card Add/Edit Dialog */}
      <CardFormModal
        open={cardModalOpen}
        onClose={() => {
          setCardModalOpen(false);
          setEditingCard(null);
        }}
        editingCard={editingCard}
        currency={store.settings.currency}
        todayDate={store.todayDate}
        onSave={async (input) => {
          const saved = await store.saveCard(input);
          if (!editingCard) {
            setSelectedCardId(saved.id);
          }
          notify(editingCard ? `Updated ${saved.name}.` : `Added ${saved.name}.`);
        }}
      />

      {/* Spending / Payment Add/Edit Dialog */}
      <TransactionFormModal
        open={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
          setTxPreset(null);
        }}
        cardSummaries={store.summary.cardSummaries}
        bankBalance={store.settings.bankBalance}
        currency={store.settings.currency}
        editingTransaction={editingTx}
        preset={txPreset}
        onSave={async (input) => {
          await store.saveTransaction(input);
          notify(
            editingTx
              ? 'Transaction updated.'
              : input.type === 'payment'
                ? 'Card payment recorded.'
                : 'Spending added.'
          );
        }}
      />

      {/* Delete Credit Card Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleConfirmDeleteCard}
        title={cardToDelete ? `Delete ${cardToDelete.name}?` : 'Delete Credit Card?'}
        message={
          cardToDelete
            ? `This permanently deletes ${cardToDelete.name}${
                cardTxCountToDelete > 0
                  ? ` along with its ${cardTxCountToDelete} recorded ${
                      cardTxCountToDelete === 1 ? 'transaction' : 'transactions'
                    }`
                  : ''
              } from local storage. Your bank balance will remain unchanged.`
            : ''
        }
        confirmLabel="Delete Card"
        destructive={true}
      />

      {/* Delete Transaction Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleConfirmDeleteTx}
        title={
          txToDelete?.type === 'payment' ? 'Delete Payment Record?' : 'Delete Spending Entry?'
        }
        message={
          txToDelete
            ? `Remove "${txToDelete.description}" (${formatMoney(
                txToDelete.amount,
                store.settings.currency
              )} on ${formatShortDate(txToDelete.date)})? Card balances and statements will recalculate immediately.`
            : ''
        }
        confirmLabel="Delete"
        destructive={true}
        checkboxLabel={
          txToDelete && txToDelete.type === 'payment' && txToDelete.deductFromBank
            ? `Refund ${formatMoney(txToDelete.amount, store.settings.currency)} back to bank balance`
            : undefined
        }
        checkboxChecked={refundBankOnDelete}
        onCheckboxChange={setRefundBankOnDelete}
      />
    </div>
  );
}
