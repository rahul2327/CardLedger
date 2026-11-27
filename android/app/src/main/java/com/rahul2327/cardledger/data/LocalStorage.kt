package com.rahul2327.cardledger.data

import android.content.Context
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.BackupPayload
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.CardColorToken
import com.rahul2327.cardledger.model.CashbackDestination
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.SpendingCategory
import com.rahul2327.cardledger.model.ThemeMode
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionType
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.abs

data class StoredData(
    val settings: AppSettings,
    val cards: List<CreditCard>,
    val transactions: List<Transaction>,
)

sealed class BackupValidationResult {
    data class Valid(val payload: BackupPayload) : BackupValidationResult()
    data class Invalid(val error: String) : BackupValidationResult()
}

class LocalStorage(context: Context) {
    private val appContext = context.applicationContext
    private val dataFile = File(appContext.filesDir, "cardledger_data.json")
    private val tempFile = File(appContext.filesDir, "cardledger_data.json.tmp")
    private val prefs = appContext.getSharedPreferences("cardledger_prefs", Context.MODE_PRIVATE)

    fun isBiometricLockCached(): Boolean = prefs.getBoolean("biometric_lock_enabled", false)

    fun setBiometricLockCache(enabled: Boolean) {
        prefs.edit().putBoolean("biometric_lock_enabled", enabled).apply()
    }

    @Synchronized
    fun loadAll(): StoredData {
        if (!dataFile.exists()) {
            val defaults = FinanceEngine.createDefaultSettings()
            setBiometricLockCache(false)
            return StoredData(defaults, emptyList(), emptyList())
        }
        val raw = runCatching { dataFile.readText(Charsets.UTF_8) }.getOrNull()
        if (raw.isNullOrBlank()) {
            val defaults = FinanceEngine.createDefaultSettings()
            return StoredData(defaults, emptyList(), emptyList())
        }
        return when (val parsed = parseAndValidateBackupJson(raw)) {
            is BackupValidationResult.Valid -> {
                setBiometricLockCache(parsed.payload.settings.biometricLockEnabled)
                StoredData(
                    settings = parsed.payload.settings,
                    cards = parsed.payload.cards.sortedBy { it.createdAt },
                    transactions = sortTransactions(parsed.payload.transactions),
                )
            }
            is BackupValidationResult.Invalid -> {
                val defaults = FinanceEngine.createDefaultSettings()
                StoredData(defaults, emptyList(), emptyList())
            }
        }
    }

    @Synchronized
    fun saveAll(settings: AppSettings, cards: List<CreditCard>, transactions: List<Transaction>) {
        setBiometricLockCache(settings.biometricLockEnabled)
        val json = buildBackupJson(settings, cards, transactions)
        tempFile.writeText(json, Charsets.UTF_8)
        if (!tempFile.renameTo(dataFile)) {
            dataFile.writeText(json, Charsets.UTF_8)
            tempFile.delete()
        }
    }

    companion object {
        fun sortTransactions(list: List<Transaction>): List<Transaction> =
            list.sortedWith(
                compareByDescending<Transaction> { it.date }
                    .thenByDescending { it.createdAt },
            )

        fun buildBackupJson(
            settings: AppSettings,
            cards: List<CreditCard>,
            transactions: List<Transaction>,
        ): String {
            val (total, bankName, normalizedAccounts) = FinanceEngine.buildBankSummaryFields(
                settings.bankAccounts,
                settings.bankUpdatedAt,
            )

            val accountsJson = JSONArray()
            for (acc in normalizedAccounts) {
                accountsJson.put(
                    JSONObject().apply {
                        put("id", acc.id)
                        put("name", acc.name)
                        put("balance", FinanceEngine.roundMoney(acc.balance))
                        put("updatedAt", acc.updatedAt)
                    },
                )
            }

            val settingsJson = JSONObject().apply {
                put("id", "app-settings")
                put("bankBalance", total)
                put("bankName", bankName)
                put("bankUpdatedAt", settings.bankUpdatedAt)
                put("bankAccounts", accountsJson)
                put("currency", settings.currency.code)
                put("theme", settings.theme.wireValue)
                put("biometricLockEnabled", settings.biometricLockEnabled)
            }

            val cardsJson = JSONArray()
            for (card in cards) {
                cardsJson.put(
                    JSONObject().apply {
                        put("id", card.id)
                        put("name", card.name)
                        put("lastFour", card.lastFour)
                        if (card.limit != null) put("limit", FinanceEngine.roundMoney(card.limit))
                        else put("limit", JSONObject.NULL)
                        put("billingDay", card.billingDay)
                        put("dueDay", card.dueDay)
                        put("colorToken", card.colorToken.wireValue)
                        put("createdAt", card.createdAt)
                    },
                )
            }

            val txsJson = JSONArray()
            for (tx in transactions) {
                txsJson.put(
                    JSONObject().apply {
                        put("id", tx.id)
                        put("cardId", tx.cardId)
                        put("type", tx.type.wireValue)
                        put("amount", FinanceEngine.roundMoney(tx.amount))
                        put("description", tx.description)
                        tx.category?.let { put("category", it.wireValue) }
                        put("date", tx.date)
                        tx.statementCycleKey?.let { put("statementCycleKey", it) }
                        tx.deductFromBank?.let { put("deductFromBank", it) }
                        tx.bankAccountId?.let { put("bankAccountId", it) }
                        tx.cashbackDestination?.let { put("cashbackDestination", it.wireValue) }
                        put("createdAt", tx.createdAt)
                        put("updatedAt", tx.updatedAt)
                    },
                )
            }

            return JSONObject().apply {
                put("schemaVersion", 2)
                put("exportedAt", FinanceEngine.nowIsoString())
                put("app", "CardLedger")
                put("settings", settingsJson)
                put("cards", cardsJson)
                put("transactions", txsJson)
            }.toString(2)
        }

        fun parseAndValidateBackupJson(rawJson: String): BackupValidationResult {
            val root = try {
                JSONObject(rawJson)
            } catch (_: Exception) {
                return BackupValidationResult.Invalid("Backup file is not valid JSON.")
            }

            val sObj = root.optJSONObject("settings")
                ?: return BackupValidationResult.Invalid("Backup is missing settings / bank balance data.")
            val cardsArr = root.optJSONArray("cards")
                ?: return BackupValidationResult.Invalid("Backup is missing the credit cards list.")
            val txArr = root.optJSONArray("transactions")
                ?: return BackupValidationResult.Invalid("Backup is missing the transactions list.")

            val nowIso = FinanceEngine.nowIsoString()
            val bankUpdatedAt = sObj.optString("bankUpdatedAt", "").ifBlank { nowIso }
            val currency = CurrencyCode.fromCode(sObj.optString("currency", "INR"))
            val theme = ThemeMode.fromWire(sObj.optString("theme", "dark"))
            val biometricLock = sObj.optBoolean("biometricLockEnabled", false)

            val sanitizedAccounts = mutableListOf<BankAccount>()
            val accountsArr = sObj.optJSONArray("bankAccounts")
            if (accountsArr != null) {
                val seenIds = HashSet<String>()
                for (i in 0 until accountsArr.length()) {
                    val aObj = accountsArr.optJSONObject(i)
                        ?: return BackupValidationResult.Invalid("Bank account #${i + 1} is invalid.")
                    val id = aObj.optString("id", "").trim()
                    val name = aObj.optString("name", "").trim()
                    val balance = aObj.optDouble("balance", Double.NaN)
                    if (id.isEmpty() || name.isEmpty()) {
                        return BackupValidationResult.Invalid("Bank account #${i + 1} is missing an id or name.")
                    }
                    if (!seenIds.add(id)) {
                        return BackupValidationResult.Invalid("Duplicate bank account ID \"$id\".")
                    }
                    if (!balance.isFinite() || abs(balance) > FinanceEngine.MAX_AMOUNT) {
                        return BackupValidationResult.Invalid("Bank account \"$name\" has an invalid balance.")
                    }
                    sanitizedAccounts.add(
                        BankAccount(
                            id = id,
                            name = name.take(60),
                            balance = FinanceEngine.roundMoney(balance),
                            updatedAt = aObj.optString("updatedAt", "").ifBlank { bankUpdatedAt },
                        ),
                    )
                }
            } else {
                // Legacy v1 single-bank migration
                val legacyBalance = sObj.optDouble("bankBalance", 0.0)
                if (!legacyBalance.isFinite() || abs(legacyBalance) > FinanceEngine.MAX_AMOUNT) {
                    return BackupValidationResult.Invalid("Bank balance in backup is invalid.")
                }
                val legacyName = sObj.optString("bankName", "").trim().take(60)
                    .ifEmpty { "Primary Bank Account" }
                sanitizedAccounts.add(
                    BankAccount(
                        id = "bank-primary",
                        name = legacyName,
                        balance = FinanceEngine.roundMoney(legacyBalance),
                        updatedAt = bankUpdatedAt,
                    ),
                )
            }

            val (totalBalance, summaryBankName, finalAccounts) =
                FinanceEngine.buildBankSummaryFields(sanitizedAccounts, bankUpdatedAt)
            val sanitizedSettings = AppSettings(
                bankBalance = totalBalance,
                bankName = summaryBankName,
                bankUpdatedAt = bankUpdatedAt,
                bankAccounts = finalAccounts,
                currency = currency,
                theme = theme,
                biometricLockEnabled = biometricLock,
            )

            val cardIds = HashSet<String>()
            val sanitizedCards = mutableListOf<CreditCard>()
            for (i in 0 until cardsArr.length()) {
                val cObj = cardsArr.optJSONObject(i)
                    ?: return BackupValidationResult.Invalid("Card entry #${i + 1} is invalid.")
                val id = cObj.optString("id", "").trim()
                val name = cObj.optString("name", "").trim()
                val billingDay = cObj.optInt("billingDay", -1)
                val dueDay = cObj.optInt("dueDay", -1)

                if (id.isEmpty() || name.isEmpty()) {
                    return BackupValidationResult.Invalid("Card entry #${i + 1} is missing an id or name.")
                }
                if (!cardIds.add(id)) {
                    return BackupValidationResult.Invalid("Duplicate credit card ID \"$id\".")
                }
                if (billingDay !in 1..31) {
                    return BackupValidationResult.Invalid("Card \"$name\" has an invalid billing day.")
                }
                if (dueDay !in 1..31) {
                    return BackupValidationResult.Invalid("Card \"$name\" has an invalid payment due day.")
                }

                val limit: Double? = if (cObj.isNull("limit") || !cObj.has("limit")) {
                    null
                } else {
                    val parsedLimit = cObj.optDouble("limit", Double.NaN)
                    if (!parsedLimit.isFinite() || parsedLimit <= 0.0 || parsedLimit > FinanceEngine.MAX_AMOUNT) {
                        return BackupValidationResult.Invalid("Card \"$name\" has an invalid credit limit.")
                    }
                    FinanceEngine.roundMoney(parsedLimit)
                }

                sanitizedCards.add(
                    CreditCard(
                        id = id,
                        name = name.take(60),
                        lastFour = cObj.optString("lastFour", "").filter { it.isDigit() }.take(4),
                        limit = limit,
                        billingDay = billingDay,
                        dueDay = dueDay,
                        colorToken = CardColorToken.fromWire(cObj.optString("colorToken", "teal")),
                        createdAt = cObj.optString("createdAt", "").ifBlank { nowIso },
                    ),
                )
            }

            val txIds = HashSet<String>()
            val sanitizedTransactions = mutableListOf<Transaction>()
            for (i in 0 until txArr.length()) {
                val tObj = txArr.optJSONObject(i)
                    ?: return BackupValidationResult.Invalid("Transaction #${i + 1} is invalid.")
                val id = tObj.optString("id", "").trim()
                val cardId = tObj.optString("cardId", "").trim()
                val type = TransactionType.fromWire(tObj.optString("type", ""))
                    ?: return BackupValidationResult.Invalid("Transaction #${i + 1} has an invalid type.")
                val amount = tObj.optDouble("amount", Double.NaN)
                val description = tObj.optString("description", "").trim()
                val date = tObj.optString("date", "").trim()

                if (id.isEmpty()) {
                    return BackupValidationResult.Invalid("Transaction #${i + 1} is missing an ID.")
                }
                if (!txIds.add(id)) {
                    return BackupValidationResult.Invalid("Duplicate transaction ID \"$id\".")
                }
                if (type != TransactionType.BANK_SPEND && (cardId.isEmpty() || !cardIds.contains(cardId))) {
                    return BackupValidationResult.Invalid("Transaction #${i + 1} references an unknown credit card.")
                }
                if (!amount.isFinite() || amount <= 0.0 || amount > FinanceEngine.MAX_AMOUNT) {
                    return BackupValidationResult.Invalid("Transaction #${i + 1} has an invalid amount.")
                }
                if (!FinanceEngine.isValidCalendarDate(date)) {
                    return BackupValidationResult.Invalid("Transaction #${i + 1} has an invalid date.")
                }

                val defaultDesc = when (type) {
                    TransactionType.PAYMENT -> "Card Payment"
                    TransactionType.BANK_SPEND -> "Bank / UPI Spend"
                    TransactionType.CASHBACK -> "Card Cashback"
                    TransactionType.SPEND -> "Card Spend"
                }

                val cashbackDestination = if (type == TransactionType.CASHBACK) {
                    CashbackDestination.fromWire(tObj.optString("cashbackDestination", "statement"))
                } else {
                    null
                }

                val rawCycleKey = tObj.optString("statementCycleKey", "").trim()
                val statementCycleKey = if (
                    (type == TransactionType.PAYMENT ||
                        (type == TransactionType.CASHBACK && cashbackDestination == CashbackDestination.STATEMENT)) &&
                    FinanceEngine.isValidCalendarDate(rawCycleKey)
                ) {
                    rawCycleKey
                } else {
                    null
                }

                val deductFromBank: Boolean? = when (type) {
                    TransactionType.PAYMENT -> if (tObj.has("deductFromBank") && !tObj.isNull("deductFromBank")) {
                        tObj.optBoolean("deductFromBank", false)
                    } else {
                        null
                    }
                    TransactionType.BANK_SPEND -> if (tObj.has("deductFromBank") && !tObj.isNull("deductFromBank")) {
                        tObj.optBoolean("deductFromBank", true)
                    } else {
                        true
                    }
                    else -> null
                }

                val bankAccountId = tObj.optString("bankAccountId", "").trim().ifEmpty { null }
                val category = if (type == TransactionType.SPEND || type == TransactionType.BANK_SPEND) {
                    SpendingCategory.fromWire(tObj.optString("category", ""))
                } else {
                    null
                }

                sanitizedTransactions.add(
                    Transaction(
                        id = id,
                        cardId = if (type == TransactionType.BANK_SPEND) "" else cardId,
                        type = type,
                        amount = FinanceEngine.roundMoney(amount),
                        description = description.take(120).ifEmpty { defaultDesc },
                        category = category,
                        date = date,
                        statementCycleKey = statementCycleKey,
                        deductFromBank = deductFromBank,
                        bankAccountId = bankAccountId,
                        cashbackDestination = cashbackDestination,
                        createdAt = tObj.optString("createdAt", "").ifBlank { nowIso },
                        updatedAt = tObj.optString("updatedAt", "").ifBlank { nowIso },
                    ),
                )
            }

            return BackupValidationResult.Valid(
                BackupPayload(
                    schemaVersion = 2,
                    exportedAt = root.optString("exportedAt", "").ifBlank { nowIso },
                    app = "CardLedger",
                    settings = sanitizedSettings,
                    cards = sanitizedCards,
                    transactions = sanitizedTransactions,
                ),
            )
        }
    }
}
