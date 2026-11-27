package com.rahul2327.cardledger.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.rahul2327.cardledger.data.BackupValidationResult
import com.rahul2327.cardledger.data.LocalStorage
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.BankAccountInput
import com.rahul2327.cardledger.model.CardInput
import com.rahul2327.cardledger.model.CashbackDestination
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.DashboardSummary
import com.rahul2327.cardledger.model.ThemeMode
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionInput
import com.rahul2327.cardledger.model.TransactionType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

data class CardLedgerUiState(
    val isLoading: Boolean = true,
    val todayDate: String = FinanceEngine.getTodayDateString(),
    val settings: AppSettings = FinanceEngine.createDefaultSettings(),
    val cards: List<CreditCard> = emptyList(),
    val transactions: List<Transaction> = emptyList(),
    val summary: DashboardSummary = FinanceEngine.computeDashboardSummary(
        FinanceEngine.createDefaultSettings(),
        emptyList(),
        emptyList(),
    ),
)

class CardLedgerViewModel(application: Application) : AndroidViewModel(application) {
    private val storage = LocalStorage(application)

    private val _uiState = MutableStateFlow(CardLedgerUiState())
    val uiState: StateFlow<CardLedgerUiState> = _uiState.asStateFlow()

    val isBiometricLockCached: Boolean
        get() = storage.isBiometricLockCached()

    init {
        viewModelScope.launch {
            val loaded = withContext(Dispatchers.IO) { storage.loadAll() }
            val today = FinanceEngine.getTodayDateString()
            _uiState.value = CardLedgerUiState(
                isLoading = false,
                todayDate = today,
                settings = loaded.settings,
                cards = loaded.cards,
                transactions = loaded.transactions,
                summary = FinanceEngine.computeDashboardSummary(
                    loaded.settings,
                    loaded.cards,
                    loaded.transactions,
                    today,
                ),
            )
        }
    }

    fun refreshTodayDate() {
        val current = FinanceEngine.getTodayDateString()
        val state = _uiState.value
        if (state.todayDate != current) {
            _uiState.update {
                it.copy(
                    todayDate = current,
                    summary = FinanceEngine.computeDashboardSummary(
                        it.settings,
                        it.cards,
                        it.transactions,
                        current,
                    ),
                )
            }
        }
    }

    private fun commitAndPersist(
        settings: AppSettings,
        cards: List<CreditCard>,
        transactions: List<Transaction>,
    ) {
        val sortedCards = cards.sortedBy { it.createdAt }
        val sortedTxs = LocalStorage.sortTransactions(transactions)
        val today = FinanceEngine.getTodayDateString()
        val summary = FinanceEngine.computeDashboardSummary(settings, sortedCards, sortedTxs, today)

        _uiState.value = CardLedgerUiState(
            isLoading = false,
            todayDate = today,
            settings = settings,
            cards = sortedCards,
            transactions = sortedTxs,
            summary = summary,
        )

        viewModelScope.launch(Dispatchers.IO) {
            storage.saveAll(settings, sortedCards, sortedTxs)
        }
    }

    private fun newId(prefix: String): String = "$prefix-${UUID.randomUUID()}"

    fun saveBankAccount(input: BankAccountInput): BankAccount {
        val state = _uiState.value
        val nowIso = FinanceEngine.nowIsoString()
        val existing = input.id?.let { id -> state.settings.bankAccounts.firstOrNull { it.id == id } }
        val record = BankAccount(
            id = existing?.id ?: newId("bank"),
            name = input.name.trim().take(60).ifEmpty { "Bank Account" },
            balance = FinanceEngine.roundMoney(input.balance),
            updatedAt = nowIso,
        )
        val nextAccounts = if (existing != null) {
            state.settings.bankAccounts.map { if (it.id == record.id) record else it }
        } else {
            state.settings.bankAccounts + record
        }
        val (total, bankName, normalized) = FinanceEngine.buildBankSummaryFields(nextAccounts, nowIso)
        val nextSettings = state.settings.copy(
            bankBalance = total,
            bankName = bankName,
            bankUpdatedAt = nowIso,
            bankAccounts = normalized,
        )
        commitAndPersist(nextSettings, state.cards, state.transactions)
        return record
    }

    fun deleteBankAccount(accountId: String) {
        val state = _uiState.value
        val nowIso = FinanceEngine.nowIsoString()
        val nextAccounts = state.settings.bankAccounts.filterNot { it.id == accountId }
        val (total, bankName, normalized) = FinanceEngine.buildBankSummaryFields(nextAccounts, nowIso)
        val nextSettings = state.settings.copy(
            bankBalance = total,
            bankName = bankName,
            bankUpdatedAt = nowIso,
            bankAccounts = normalized,
        )
        commitAndPersist(nextSettings, state.cards, state.transactions)
    }

    fun updateTheme(theme: ThemeMode) {
        val state = _uiState.value
        commitAndPersist(state.settings.copy(theme = theme), state.cards, state.transactions)
    }

    fun updateCurrency(currency: CurrencyCode) {
        val state = _uiState.value
        commitAndPersist(state.settings.copy(currency = currency), state.cards, state.transactions)
    }

    fun updateBiometricLock(enabled: Boolean) {
        val state = _uiState.value
        commitAndPersist(
            state.settings.copy(biometricLockEnabled = enabled),
            state.cards,
            state.transactions,
        )
    }

    fun saveCard(input: CardInput): CreditCard {
        val state = _uiState.value
        val nowIso = FinanceEngine.nowIsoString()
        val existing = input.id?.let { id -> state.cards.firstOrNull { it.id == id } }
        val record = CreditCard(
            id = existing?.id ?: newId("card"),
            name = input.name.trim().take(60),
            lastFour = input.lastFour.filter { it.isDigit() }.take(4),
            limit = input.limit?.let { FinanceEngine.roundMoney(it) },
            billingDay = input.billingDay,
            dueDay = input.dueDay,
            colorToken = input.colorToken,
            createdAt = existing?.createdAt ?: nowIso,
        )
        val nextCards = if (existing != null) {
            state.cards.map { if (it.id == record.id) record else it }
        } else {
            state.cards + record
        }
        commitAndPersist(state.settings, nextCards, state.transactions)
        return record
    }

    fun deleteCard(cardId: String) {
        val state = _uiState.value
        val nextCards = state.cards.filterNot { it.id == cardId }
        val nextTxs = state.transactions.filterNot { it.cardId == cardId }
        commitAndPersist(state.settings, nextCards, nextTxs)
    }

    fun saveTransaction(input: TransactionInput): Transaction {
        val state = _uiState.value
        val nowIso = FinanceEngine.nowIsoString()
        val existing = input.id?.let { id -> state.transactions.firstOrNull { it.id == id } }
        val amount = FinanceEngine.roundMoney(input.amount)
        val accounts = state.settings.bankAccounts

        fun resolveAccountId(preferred: String?): String? =
            preferred?.let { id -> accounts.firstOrNull { it.id == id }?.id }
                ?: accounts.firstOrNull()?.id

        val cashbackDest = if (input.type == TransactionType.CASHBACK) {
            input.cashbackDestination ?: CashbackDestination.STATEMENT
        } else {
            null
        }

        val wantsBankLink =
            (input.type == TransactionType.PAYMENT && input.deductFromBank == true) ||
                input.type == TransactionType.BANK_SPEND ||
                (input.type == TransactionType.CASHBACK && cashbackDest == CashbackDestination.BANK)

        val resolvedBankId = if (wantsBankLink) resolveAccountId(input.bankAccountId) else null

        val effectiveDeduct: Boolean? = when (input.type) {
            TransactionType.PAYMENT -> (input.deductFromBank == true && resolvedBankId != null)
            TransactionType.BANK_SPEND -> (input.deductFromBank != false && resolvedBankId != null)
            else -> null
        }

        val trimmedDesc = input.description.trim().take(120)
        val record = Transaction(
            id = existing?.id ?: newId("tx"),
            cardId = if (input.type == TransactionType.BANK_SPEND) "" else input.cardId,
            type = input.type,
            amount = amount,
            description = trimmedDesc,
            category = if (input.type == TransactionType.SPEND || input.type == TransactionType.BANK_SPEND) {
                input.category ?: FinanceEngine.inferSpendingCategory(trimmedDesc)
            } else {
                null
            },
            date = input.date,
            statementCycleKey = if (
                (input.type == TransactionType.PAYMENT ||
                    (input.type == TransactionType.CASHBACK && cashbackDest == CashbackDestination.STATEMENT)) &&
                !input.statementCycleKey.isNullOrBlank()
            ) {
                input.statementCycleKey
            } else {
                null
            },
            deductFromBank = effectiveDeduct,
            bankAccountId = resolvedBankId,
            cashbackDestination = cashbackDest,
            createdAt = existing?.createdAt ?: nowIso,
            updatedAt = nowIso,
        )

        val mutableAccounts = accounts.toMutableList()
        var bankChanged = false

        if (existing != null) {
            val prevEffect = FinanceEngine.getTransactionBankEffect(existing, mutableAccounts)
            if (prevEffect != null) {
                val idx = mutableAccounts.indexOfFirst { it.id == prevEffect.account.id }
                if (idx >= 0) {
                    mutableAccounts[idx] = mutableAccounts[idx].copy(
                        balance = FinanceEngine.roundMoney(mutableAccounts[idx].balance - prevEffect.delta),
                        updatedAt = nowIso,
                    )
                    bankChanged = true
                }
            }
        }

        val nextEffect = FinanceEngine.getTransactionBankEffect(record, mutableAccounts)
        if (nextEffect != null) {
            val idx = mutableAccounts.indexOfFirst { it.id == nextEffect.account.id }
            if (idx >= 0) {
                mutableAccounts[idx] = mutableAccounts[idx].copy(
                    balance = FinanceEngine.roundMoney(mutableAccounts[idx].balance + nextEffect.delta),
                    updatedAt = nowIso,
                )
                bankChanged = true
            }
        }

        val nextSettings = if (bankChanged) {
            val (total, bankName, normalized) = FinanceEngine.buildBankSummaryFields(mutableAccounts, nowIso)
            state.settings.copy(
                bankBalance = total,
                bankName = bankName,
                bankUpdatedAt = nowIso,
                bankAccounts = normalized,
            )
        } else {
            state.settings
        }

        val nextTxs = if (existing != null) {
            state.transactions.map { if (it.id == record.id) record else it }
        } else {
            listOf(record) + state.transactions
        }

        commitAndPersist(nextSettings, state.cards, nextTxs)
        return record
    }

    fun deleteTransaction(transactionId: String, adjustBankBalance: Boolean) {
        val state = _uiState.value
        val existing = state.transactions.firstOrNull { it.id == transactionId } ?: return

        val nextSettings = if (adjustBankBalance) {
            val nowIso = FinanceEngine.nowIsoString()
            val mutableAccounts = state.settings.bankAccounts.toMutableList()
            val effect = FinanceEngine.getTransactionBankEffect(existing, mutableAccounts)
            if (effect != null) {
                val idx = mutableAccounts.indexOfFirst { it.id == effect.account.id }
                if (idx >= 0) {
                    mutableAccounts[idx] = mutableAccounts[idx].copy(
                        balance = FinanceEngine.roundMoney(mutableAccounts[idx].balance - effect.delta),
                        updatedAt = nowIso,
                    )
                    val (total, bankName, normalized) =
                        FinanceEngine.buildBankSummaryFields(mutableAccounts, nowIso)
                    state.settings.copy(
                        bankBalance = total,
                        bankName = bankName,
                        bankUpdatedAt = nowIso,
                        bankAccounts = normalized,
                    )
                } else {
                    state.settings
                }
            } else {
                state.settings
            }
        } else {
            state.settings
        }

        val nextTxs = state.transactions.filterNot { it.id == transactionId }
        commitAndPersist(nextSettings, state.cards, nextTxs)
    }

    fun exportBackupJson(): String {
        val state = _uiState.value
        return LocalStorage.buildBackupJson(state.settings, state.cards, state.transactions)
    }

    fun importBackupJson(rawJson: String): BackupValidationResult {
        val result = LocalStorage.parseAndValidateBackupJson(rawJson)
        if (result is BackupValidationResult.Valid) {
            commitAndPersist(
                result.payload.settings,
                result.payload.cards,
                result.payload.transactions,
            )
        }
        return result
    }

    fun loadSampleData() {
        val currentTheme = _uiState.value.settings.theme
        val (settings, cards, transactions) = FinanceEngine.createSampleDataset(currentTheme)
        commitAndPersist(settings, cards, transactions)
    }

    fun clearAllData() {
        val current = _uiState.value.settings
        val reset = FinanceEngine.createDefaultSettings(
            currency = current.currency,
            theme = current.theme,
        )
        commitAndPersist(reset, emptyList(), emptyList())
    }
}
