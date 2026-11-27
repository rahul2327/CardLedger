package com.rahul2327.cardledger.model

enum class CurrencyCode(
    val code: String,
    val symbol: String,
    val displayLabel: String,
    val languageTag: String,
) {
    INR("INR", "₹", "Indian Rupee (₹)", "en-IN"),
    USD("USD", "$", "US Dollar ($)", "en-US"),
    EUR("EUR", "€", "Euro (€)", "de-DE"),
    GBP("GBP", "£", "British Pound (£)", "en-GB");

    companion object {
        fun fromCode(raw: String?): CurrencyCode =
            entries.firstOrNull { it.code.equals(raw, ignoreCase = true) } ?: INR
    }
}

enum class ThemeMode(val wireValue: String, val label: String) {
    LIGHT("light", "Light"),
    DARK("dark", "Dark"),
    SYSTEM("system", "System");

    companion object {
        fun fromWire(raw: String?): ThemeMode =
            entries.firstOrNull { it.wireValue.equals(raw, ignoreCase = true) } ?: DARK
    }
}

enum class CardColorToken(
    val wireValue: String,
    val label: String,
    val lightSwatch: Long,
    val darkSwatch: Long,
    val lightAccent: Long,
    val darkAccent: Long,
    val lightSoftBg: Long,
    val darkSoftBg: Long,
) {
    TEAL("teal", "Eucalyptus", 0xFF196A5E, 0xFF70C4B4, 0xFF196A5E, 0xFF82D5C5, 0xFFD6EFE9, 0xFF163833),
    INDIGO("indigo", "Slate Blue", 0xFF3D5A80, 0xFF93B4DC, 0xFF345074, 0xFF9EC0E8, 0xFFDCE6F2, 0xFF1E2E42),
    EMERALD("emerald", "Sage Green", 0xFF2D6A4F, 0xFF82C9A6, 0xFF245A42, 0xFF8CD4B1, 0xFFD7EDE2, 0xFF193729),
    AMBER("amber", "Warm Ochre", 0xFF9C6615, 0xFFE2B56D, 0xFF87560C, 0xFFE7BF78, 0xFFF3E5CE, 0xFF3C2D14),
    ROSE("rose", "Muted Clay", 0xFF94475B, 0xFFE09CAE, 0xFF83394D, 0xFFE5A7B7, 0xFFF2DFE4, 0xFF3B1F27),
    SLATE("slate", "Graphite", 0xFF4A5759, 0xFFA6B6B8, 0xFF3E4B4D, 0xFFB4C4C6, 0xFFE1E7E8, 0xFF252E30);

    companion object {
        fun fromWire(raw: String?): CardColorToken =
            entries.firstOrNull { it.wireValue.equals(raw, ignoreCase = true) } ?: TEAL
    }
}

enum class TransactionType(val wireValue: String) {
    SPEND("spend"),
    PAYMENT("payment"),
    BANK_SPEND("bank_spend"),
    CASHBACK("cashback");

    companion object {
        fun fromWire(raw: String?): TransactionType? =
            entries.firstOrNull { it.wireValue.equals(raw, ignoreCase = true) }
    }
}

enum class CashbackDestination(val wireValue: String) {
    STATEMENT("statement"),
    BANK("bank");

    companion object {
        fun fromWire(raw: String?): CashbackDestination =
            if (raw.equals("bank", ignoreCase = true)) BANK else STATEMENT
    }
}

enum class SpendingCategory(
    val wireValue: String,
    val label: String,
    val shortLabel: String,
    val lightColor: Long,
    val darkColor: Long,
) {
    FOOD("food", "Food & Dining", "Food", 0xFF0B57D0, 0xFFA8C7FA),
    SHOPPING("shopping", "Shopping", "Shopping", 0xFF7C3AED, 0xFFC4B5FD),
    BILLS("bills", "Bills & Utilities", "Bills", 0xFF0D9488, 0xFF5EEAD4),
    TRAVEL("travel", "Travel & Transit", "Travel", 0xFFD97706, 0xFFFCD34D),
    FUEL("fuel", "Fuel & Auto", "Fuel", 0xFFEA580C, 0xFFFDBA74),
    HEALTH("health", "Health & Wellness", "Health", 0xFF16A34A, 0xFF86EFAC),
    ENTERTAINMENT("entertainment", "Entertainment", "Fun", 0xFFDB2777, 0xFFF9A8D4),
    OTHER("other", "Other", "Other", 0xFF64748B, 0xFF94A3B8);

    companion object {
        fun fromWire(raw: String?): SpendingCategory? =
            entries.firstOrNull { it.wireValue.equals(raw, ignoreCase = true) }
    }
}

enum class PaymentStatus {
    PAID,
    PARTIALLY_PAID,
    UNPAID,
    OVERDUE,
    NO_BILL,
}

enum class NavTab(val label: String, val pageTitle: String) {
    DASHBOARD("Dashboard", "Overview"),
    CARDS("Cards", "Credit Cards"),
    BILLS("Bills", "Bills & Cycles"),
    HISTORY("History", "Transactions"),
    SETTINGS("Settings", "Settings"),
}

data class BankAccount(
    val id: String,
    val name: String,
    val balance: Double,
    val updatedAt: String,
)

data class AppSettings(
    val id: String = "app-settings",
    val bankBalance: Double,
    val bankName: String,
    val bankUpdatedAt: String,
    val bankAccounts: List<BankAccount>,
    val currency: CurrencyCode = CurrencyCode.INR,
    val theme: ThemeMode = ThemeMode.DARK,
    val biometricLockEnabled: Boolean = false,
)

data class CreditCard(
    val id: String,
    val name: String,
    val lastFour: String,
    val limit: Double?,
    val billingDay: Int,
    val dueDay: Int,
    val colorToken: CardColorToken,
    val createdAt: String,
)

data class Transaction(
    val id: String,
    val cardId: String,
    val type: TransactionType,
    val amount: Double,
    val description: String,
    val category: SpendingCategory? = null,
    val date: String, // YYYY-MM-DD local date
    val statementCycleKey: String? = null,
    val deductFromBank: Boolean? = null,
    val bankAccountId: String? = null,
    val cashbackDestination: CashbackDestination? = null,
    val createdAt: String,
    val updatedAt: String,
)

data class CycleWindow(
    val cycleKey: String,
    val cycleStart: String,
    val statementDate: String,
    val dueDate: String,
)

data class BillingStatement(
    val cycleKey: String,
    val cardId: String,
    val cycleStart: String,
    val statementDate: String,
    val dueDate: String,
    val isGenerated: Boolean,
    val billedAmount: Double,
    val paidAmount: Double,
    val remainingAmount: Double,
    val status: PaymentStatus,
    val transactionCount: Int,
)

data class CardSummary(
    val card: CreditCard,
    val totalSpend: Double,
    val totalPayments: Double,
    val totalCashback: Double,
    val currentOutstanding: Double,
    val creditSurplus: Double,
    val remainingLimit: Double?,
    val utilizationPercent: Double?,
    val currentCycle: BillingStatement,
    val latestStatement: BillingStatement?,
    val previousStatement: BillingStatement?,
    val generatedStatements: List<BillingStatement>,
    val upcomingBillAmount: Double,
    val currentUnbilledAmount: Double,
    val unbilledTransactionCount: Int,
    val nextDueDate: String?,
    val nextStatementDate: String,
)

data class UpcomingBillItem(
    val card: CreditCard,
    val statement: BillingStatement,
    val daysUntilDue: Int,
)

data class DashboardSummary(
    val bankBalance: Double,
    val totalCCOutstanding: Double,
    val upcomingCCBills: Double,
    val currentUnbilledTotal: Double,
    val balanceAfterCCPayments: Double,
    val totalCashback: Double,
    val totalBankSpend: Double,
    val cardSummaries: List<CardSummary>,
    val upcomingDueBills: List<UpcomingBillItem>,
)

data class BackupPayload(
    val schemaVersion: Int = 2,
    val exportedAt: String,
    val app: String = "CardLedger",
    val settings: AppSettings,
    val cards: List<CreditCard>,
    val transactions: List<Transaction>,
)

data class BankAccountInput(
    val id: String? = null,
    val name: String,
    val balance: Double,
)

data class CardInput(
    val id: String? = null,
    val name: String,
    val lastFour: String,
    val limit: Double?,
    val billingDay: Int,
    val dueDay: Int,
    val colorToken: CardColorToken,
)

data class TransactionInput(
    val id: String? = null,
    val cardId: String,
    val type: TransactionType,
    val amount: Double,
    val description: String,
    val category: SpendingCategory? = null,
    val date: String,
    val statementCycleKey: String? = null,
    val deductFromBank: Boolean? = null,
    val bankAccountId: String? = null,
    val cashbackDestination: CashbackDestination? = null,
)

data class TransactionModalPreset(
    val type: TransactionType? = null,
    val cardId: String? = null,
    val bankAccountId: String? = null,
    val amount: Double? = null,
    val description: String? = null,
    val statementCycleKey: String? = null,
    val cashbackDestination: CashbackDestination? = null,
)

data class BankEffect(
    val account: BankAccount,
    val delta: Double,
)
