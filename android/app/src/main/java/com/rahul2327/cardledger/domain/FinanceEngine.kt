package com.rahul2327.cardledger.domain

import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.BankEffect
import com.rahul2327.cardledger.model.BillingStatement
import com.rahul2327.cardledger.model.CardColorToken
import com.rahul2327.cardledger.model.CardSummary
import com.rahul2327.cardledger.model.CashbackDestination
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.CycleWindow
import com.rahul2327.cardledger.model.DashboardSummary
import com.rahul2327.cardledger.model.PaymentStatus
import com.rahul2327.cardledger.model.SpendingCategory
import com.rahul2327.cardledger.model.ThemeMode
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.model.UpcomingBillItem
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

object FinanceEngine {
    const val MAX_AMOUNT = 999_999_999.99

    private val DATE_REGEX = Regex("^\\d{4}-\\d{2}-\\d{2}$")

    private val SHORT_MONTHS = listOf(
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    )

    private val WEEKDAYS = listOf(
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    )

    private val CATEGORY_KEYWORDS: List<Pair<SpendingCategory, List<String>>> = listOf(
        SpendingCategory.FOOD to listOf(
            "grocery", "groceries", "supermarket", "food", "dining", "restaurant", "cafe",
            "coffee", "bakery", "swiggy", "zomato", "blinkit", "zepto", "instamart",
            "produce", "lunch", "dinner", "breakfast", "pizza", "burger", "tea", "snacks",
            "dairy", "milk", "market", "kirana", "vegetable", "vegetables", "fruits", "chai", "juice",
        ),
        SpendingCategory.TRAVEL to listOf(
            "flight", "airline", "indigo", "air india", "hotel", "airbnb", "metro", "train",
            "irctc", "uber", "ola", "rapido", "cab", "taxi", "rickshaw", "auto rickshaw",
            "bus", "commute", "travel", "trip", "booking", "ticket",
        ),
        SpendingCategory.FUEL to listOf(
            "fuel", "petrol", "diesel", "gas station", "hpcl", "bpcl", "iocl", "shell",
            "parking", "toll", "fastag", "service center", "car wash", "tyre", "puncture", "bike service",
        ),
        SpendingCategory.BILLS to listOf(
            "electricity", "broadband", "fiber", "wifi", "internet", "recharge", "mobile",
            "postpaid", "water", "gas bill", "utility", "utilities", "insurance", "rent",
            "cloud", "storage", "subscription", "software", "domain", "hosting", "bill",
        ),
        SpendingCategory.HEALTH to listOf(
            "pharmacy", "medicine", "medical", "hospital", "doctor", "clinic", "lab",
            "dental", "wellness", "health", "gym", "fitness", "apollo", "1mg", "pharmeasy",
        ),
        SpendingCategory.ENTERTAINMENT to listOf(
            "movie", "cinema", "pvr", "inox", "netflix", "spotify", "prime video", "hotstar",
            "youtube", "game", "gaming", "steam", "playstation", "concert", "event", "bookmyshow",
        ),
        SpendingCategory.SHOPPING to listOf(
            "amazon", "flipkart", "myntra", "ajio", "nykaa", "shopping", "mall", "clothes",
            "apparel", "shoes", "electronics", "headphones", "phone", "laptop", "accessories",
            "desk", "furniture", "home", "ikea", "gift", "order",
        ),
    )

    fun nowIsoString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    fun roundMoney(value: Double): Double {
        if (!value.isFinite()) return 0.0
        val sign = if (value < 0.0) -1.0 else 1.0
        val rounded = sign * (round(abs(value) * 100.0 + 1e-9) / 100.0)
        return if (rounded == 0.0) 0.0 else rounded
    }

    fun getTodayDateString(): String {
        val cal = Calendar.getInstance()
        return formatDateParts(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH),
        )
    }

    data class DateParts(val year: Int, val month: Int, val day: Int)

    fun parseDateParts(dateStr: String): DateParts {
        val parts = dateStr.split("-")
        return DateParts(
            year = parts.getOrNull(0)?.toIntOrNull() ?: 2026,
            month = parts.getOrNull(1)?.toIntOrNull() ?: 1,
            day = parts.getOrNull(2)?.toIntOrNull() ?: 1,
        )
    }

    fun formatDateParts(year: Int, month: Int, day: Int): String =
        String.format(Locale.US, "%04d-%02d-%02d", year, month, day)

    fun isLeapYear(year: Int): Boolean =
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)

    fun daysInMonth(year: Int, month: Int): Int = when (month) {
        1, 3, 5, 7, 8, 10, 12 -> 31
        4, 6, 9, 11 -> 30
        2 -> if (isLeapYear(year)) 29 else 28
        else -> 30
    }

    fun isValidCalendarDate(dateStr: String): Boolean {
        if (!DATE_REGEX.matches(dateStr)) return false
        val p = parseDateParts(dateStr)
        if (p.month !in 1..12) return false
        return p.day in 1..daysInMonth(p.year, p.month)
    }

    fun clampDayToMonth(year: Int, month: Int, day: Int): String {
        val clamped = day.coerceIn(1, daysInMonth(year, month))
        return formatDateParts(year, month, clamped)
    }

    fun shiftYearMonth(year: Int, month: Int, deltaMonths: Int): Pair<Int, Int> {
        val totalMonths = year * 12 + (month - 1) + deltaMonths
        val newYear = Math.floorDiv(totalMonths, 12)
        val newMonth = Math.floorMod(totalMonths, 12) + 1
        return newYear to newMonth
    }

    fun addDaysToDateString(dateStr: String, deltaDays: Int): String {
        val p = parseDateParts(dateStr)
        val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
        cal.clear()
        cal.set(p.year, p.month - 1, p.day)
        cal.add(Calendar.DAY_OF_MONTH, deltaDays)
        return formatDateParts(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH),
        )
    }

    fun daysBetweenDateStrings(fromDateStr: String, toDateStr: String): Int {
        val a = parseDateParts(fromDateStr)
        val b = parseDateParts(toDateStr)
        val calA = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(a.year, a.month - 1, a.day)
        }
        val calB = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(b.year, b.month - 1, b.day)
        }
        val diffMs = calB.timeInMillis - calA.timeInMillis
        return round(diffMs / 86_400_000.0).toInt()
    }

    fun getDueDateForStatement(statementDate: String, billingDay: Int, dueDay: Int): String {
        val p = parseDateParts(statementDate)
        return if (dueDay > billingDay && dueDay - billingDay >= 5) {
            clampDayToMonth(p.year, p.month, dueDay)
        } else {
            val (ny, nm) = shiftYearMonth(p.year, p.month, 1)
            clampDayToMonth(ny, nm, dueDay)
        }
    }

    fun buildCycleWindow(year: Int, month: Int, billingDay: Int, dueDay: Int): CycleWindow {
        val statementDate = clampDayToMonth(year, month, billingDay)
        val (py, pm) = shiftYearMonth(year, month, -1)
        val prevStatementDate = clampDayToMonth(py, pm, billingDay)
        val cycleStart = addDaysToDateString(prevStatementDate, 1)
        val dueDate = getDueDateForStatement(statementDate, billingDay, dueDay)
        return CycleWindow(
            cycleKey = statementDate,
            cycleStart = cycleStart,
            statementDate = statementDate,
            dueDate = dueDate,
        )
    }

    fun getCycleWindowForTransactionDate(txDate: String, billingDay: Int, dueDay: Int): CycleWindow {
        val p = parseDateParts(txDate)
        val thisMonthStmt = clampDayToMonth(p.year, p.month, billingDay)
        return if (txDate <= thisMonthStmt) {
            buildCycleWindow(p.year, p.month, billingDay, dueDay)
        } else {
            val (ny, nm) = shiftYearMonth(p.year, p.month, 1)
            buildCycleWindow(ny, nm, billingDay, dueDay)
        }
    }

    fun getCurrentOpenCycleWindow(today: String, billingDay: Int, dueDay: Int): CycleWindow {
        val p = parseDateParts(today)
        val thisMonthStmt = clampDayToMonth(p.year, p.month, billingDay)
        return if (today < thisMonthStmt) {
            buildCycleWindow(p.year, p.month, billingDay, dueDay)
        } else {
            val (ny, nm) = shiftYearMonth(p.year, p.month, 1)
            buildCycleWindow(ny, nm, billingDay, dueDay)
        }
    }

    data class CardSchedulePreview(
        val currentCycleStart: String,
        val nextStatementDate: String,
        val nextStatementDueDate: String,
        val latestStatementDate: String,
        val latestStatementDueDate: String,
    )

    fun previewCardSchedule(billingDay: Int, dueDay: Int, today: String = getTodayDateString()): CardSchedulePreview {
        val openCycle = getCurrentOpenCycleWindow(today, billingDay, dueDay)
        val p = parseDateParts(openCycle.statementDate)
        val (ly, lm) = shiftYearMonth(p.year, p.month, -1)
        val latestCycle = buildCycleWindow(ly, lm, billingDay, dueDay)
        return CardSchedulePreview(
            currentCycleStart = openCycle.cycleStart,
            nextStatementDate = openCycle.statementDate,
            nextStatementDueDate = openCycle.dueDate,
            latestStatementDate = latestCycle.statementDate,
            latestStatementDueDate = latestCycle.dueDate,
        )
    }

    private fun determineStatementStatus(
        billedAmount: Double,
        paidAmount: Double,
        remainingAmount: Double,
        dueDate: String,
        isGenerated: Boolean,
        today: String,
    ): PaymentStatus {
        if (billedAmount <= 0.0) return PaymentStatus.NO_BILL
        if (remainingAmount <= 0.0) return PaymentStatus.PAID
        if (paidAmount > 0.0) return PaymentStatus.PARTIALLY_PAID
        if (isGenerated && dueDate < today) return PaymentStatus.OVERDUE
        return PaymentStatus.UNPAID
    }

    private data class MutableCycleBucket(
        val window: CycleWindow,
        var billedAmount: Double = 0.0,
        var transactionCount: Int = 0,
        var paidAmount: Double = 0.0,
    )

    fun computeCardSummary(
        card: CreditCard,
        allTransactions: List<Transaction>,
        today: String = getTodayDateString(),
    ): CardSummary {
        val cardTxs = allTransactions.filter { it.cardId == card.id }
        val spendTxs = cardTxs.filter { it.type == TransactionType.SPEND }
        val paymentTxs = cardTxs.filter { it.type == TransactionType.PAYMENT }
        val cashbackTxs = cardTxs.filter { it.type == TransactionType.CASHBACK }
        val statementCashbackTxs = cashbackTxs.filter {
            (it.cashbackDestination ?: CashbackDestination.STATEMENT) == CashbackDestination.STATEMENT
        }

        val totalSpend = roundMoney(spendTxs.sumOf { it.amount })
        val totalPayments = roundMoney(paymentTxs.sumOf { it.amount })
        val totalCashback = roundMoney(cashbackTxs.sumOf { it.amount })
        val statementCashbackTotal = roundMoney(statementCashbackTxs.sumOf { it.amount })
        val totalCardCredits = roundMoney(totalPayments + statementCashbackTotal)
        val currentOutstanding = max(0.0, roundMoney(totalSpend - totalCardCredits))
        val creditSurplus = max(0.0, roundMoney(totalCardCredits - totalSpend))

        val openCycleWin = getCurrentOpenCycleWindow(today, card.billingDay, card.dueDay)
        val openParts = parseDateParts(openCycleWin.statementDate)
        val (ly, lm) = shiftYearMonth(openParts.year, openParts.month, -1)
        val (py, pm) = shiftYearMonth(openParts.year, openParts.month, -2)

        val latestWin = buildCycleWindow(ly, lm, card.billingDay, card.dueDay)
        val prevWin = buildCycleWindow(py, pm, card.billingDay, card.dueDay)

        val cycleMap = LinkedHashMap<String, MutableCycleBucket>()
        fun ensureCycle(win: CycleWindow): MutableCycleBucket =
            cycleMap.getOrPut(win.cycleKey) { MutableCycleBucket(win) }

        ensureCycle(openCycleWin)
        ensureCycle(latestWin)
        ensureCycle(prevWin)

        for (tx in spendTxs) {
            val win = getCycleWindowForTransactionDate(tx.date, card.billingDay, card.dueDay)
            val entry = ensureCycle(win)
            entry.billedAmount = roundMoney(entry.billedAmount + tx.amount)
            entry.transactionCount += 1
        }

        val chronologicalCycles = cycleMap.values.sortedBy { it.window.statementDate }

        // Step 1: Apply payments and statement-credit cashback explicitly targeting a statementCycleKey
        val cardCreditTxs = paymentTxs + statementCashbackTxs
        var unallocatedPool = 0.0
        for (creditTx in cardCreditTxs) {
            val key = creditTx.statementCycleKey
            if (key != null && cycleMap.containsKey(key)) {
                val target = cycleMap[key]!!
                val room = max(0.0, roundMoney(target.billedAmount - target.paidAmount))
                val applied = min(creditTx.amount, room)
                target.paidAmount = roundMoney(target.paidAmount + applied)
                val overflow = roundMoney(creditTx.amount - applied)
                if (overflow > 0.0) {
                    unallocatedPool = roundMoney(unallocatedPool + overflow)
                }
            } else {
                unallocatedPool = roundMoney(unallocatedPool + creditTx.amount)
            }
        }

        // Step 2: Apply remaining pool FIFO chronologically
        for (entry in chronologicalCycles) {
            if (unallocatedPool <= 0.0) break
            val room = max(0.0, roundMoney(entry.billedAmount - entry.paidAmount))
            if (room <= 0.0) continue
            val applied = min(unallocatedPool, room)
            entry.paidAmount = roundMoney(entry.paidAmount + applied)
            unallocatedPool = roundMoney(unallocatedPool - applied)
        }

        val allStatements = chronologicalCycles.map { entry ->
            val isGenerated = entry.window.statementDate <= today
            val remaining = max(0.0, roundMoney(entry.billedAmount - entry.paidAmount))
            val status = determineStatementStatus(
                billedAmount = entry.billedAmount,
                paidAmount = entry.paidAmount,
                remainingAmount = remaining,
                dueDate = entry.window.dueDate,
                isGenerated = isGenerated,
                today = today,
            )
            BillingStatement(
                cycleKey = entry.window.cycleKey,
                cardId = card.id,
                cycleStart = entry.window.cycleStart,
                statementDate = entry.window.statementDate,
                dueDate = entry.window.dueDate,
                isGenerated = isGenerated,
                billedAmount = entry.billedAmount,
                paidAmount = entry.paidAmount,
                remainingAmount = remaining,
                status = status,
                transactionCount = entry.transactionCount,
            )
        }

        val currentCycle = allStatements.firstOrNull { it.cycleKey == openCycleWin.cycleKey }
            ?: BillingStatement(
                cycleKey = openCycleWin.cycleKey,
                cardId = card.id,
                cycleStart = openCycleWin.cycleStart,
                statementDate = openCycleWin.statementDate,
                dueDate = openCycleWin.dueDate,
                isGenerated = false,
                billedAmount = 0.0,
                paidAmount = 0.0,
                remainingAmount = 0.0,
                status = PaymentStatus.NO_BILL,
                transactionCount = 0,
            )

        val generatedStatements = allStatements
            .filter {
                it.isGenerated && (
                    it.billedAmount > 0.0 ||
                        it.cycleKey == latestWin.cycleKey ||
                        it.cycleKey == prevWin.cycleKey
                    )
            }
            .sortedByDescending { it.statementDate }

        val latestStatement = generatedStatements.firstOrNull { it.cycleKey == latestWin.cycleKey }
            ?: generatedStatements.getOrNull(0)
        val previousStatement = generatedStatements.firstOrNull { it.cycleKey == prevWin.cycleKey }
            ?: generatedStatements.getOrNull(1)

        val upcomingBillAmount = roundMoney(generatedStatements.sumOf { it.remainingAmount })

        val unbilledCycles = allStatements.filter { !it.isGenerated }
        val futureUnbilledAmount = roundMoney(unbilledCycles.sumOf { it.remainingAmount })
        val unbilledTransactionCount = unbilledCycles.sumOf { it.transactionCount }

        val unpaidSortedByDue = generatedStatements
            .filter { it.remainingAmount > 0.0 }
            .sortedBy { it.dueDate }
        val nextDueDate = unpaidSortedByDue.firstOrNull()?.dueDate ?: currentCycle.dueDate

        val remainingLimit = card.limit?.let { roundMoney(it - currentOutstanding) }
        val utilizationPercent = if (card.limit != null && card.limit > 0.0) {
            min(999.0, round((currentOutstanding / card.limit) * 1000.0) / 10.0)
        } else {
            null
        }

        return CardSummary(
            card = card,
            totalSpend = totalSpend,
            totalPayments = totalPayments,
            totalCashback = totalCashback,
            currentOutstanding = currentOutstanding,
            creditSurplus = creditSurplus,
            remainingLimit = remainingLimit,
            utilizationPercent = utilizationPercent,
            currentCycle = currentCycle,
            latestStatement = latestStatement,
            previousStatement = previousStatement,
            generatedStatements = generatedStatements,
            upcomingBillAmount = upcomingBillAmount,
            currentUnbilledAmount = futureUnbilledAmount,
            unbilledTransactionCount = unbilledTransactionCount,
            nextDueDate = nextDueDate,
            nextStatementDate = currentCycle.statementDate,
        )
    }

    fun getTotalBankBalance(settings: AppSettings): Double =
        roundMoney(settings.bankAccounts.sumOf { if (it.balance.isFinite()) it.balance else 0.0 })

    fun computeDashboardSummary(
        settings: AppSettings,
        cards: List<CreditCard>,
        transactions: List<Transaction>,
        today: String = getTodayDateString(),
    ): DashboardSummary {
        val cardSummaries = cards.map { computeCardSummary(it, transactions, today) }
        val totalCCOutstanding = roundMoney(cardSummaries.sumOf { it.currentOutstanding })
        val upcomingCCBills = roundMoney(cardSummaries.sumOf { it.upcomingBillAmount })
        val currentUnbilledTotal = roundMoney(cardSummaries.sumOf { it.currentUnbilledAmount })
        val totalCashback = roundMoney(cardSummaries.sumOf { it.totalCashback })
        val totalBankSpend = roundMoney(
            transactions.filter { it.type == TransactionType.BANK_SPEND }.sumOf { it.amount },
        )
        val totalBankBalance = getTotalBankBalance(settings)
        val balanceAfterCCPayments = roundMoney(totalBankBalance - totalCCOutstanding)

        val upcomingDueBills = mutableListOf<UpcomingBillItem>()
        for (cs in cardSummaries) {
            for (stmt in cs.generatedStatements) {
                if (stmt.remainingAmount > 0.0) {
                    upcomingDueBills.add(
                        UpcomingBillItem(
                            card = cs.card,
                            statement = stmt,
                            daysUntilDue = daysBetweenDateStrings(today, stmt.dueDate),
                        ),
                    )
                }
            }
        }
        upcomingDueBills.sortBy { it.statement.dueDate }

        return DashboardSummary(
            bankBalance = totalBankBalance,
            totalCCOutstanding = totalCCOutstanding,
            upcomingCCBills = upcomingCCBills,
            currentUnbilledTotal = currentUnbilledTotal,
            balanceAfterCCPayments = balanceAfterCCPayments,
            totalCashback = totalCashback,
            totalBankSpend = totalBankSpend,
            cardSummaries = cardSummaries,
            upcomingDueBills = upcomingDueBills,
        )
    }

    fun getTransactionBankEffect(tx: Transaction, accounts: List<BankAccount>): BankEffect? {
        if (accounts.isEmpty()) return null
        fun findAccount(): BankAccount? =
            (tx.bankAccountId?.let { id -> accounts.firstOrNull { it.id == id } })
                ?: accounts.firstOrNull()

        return when (tx.type) {
            TransactionType.PAYMENT -> {
                if (tx.deductFromBank == true) {
                    findAccount()?.let { BankEffect(it, -roundMoney(tx.amount)) }
                } else {
                    null
                }
            }
            TransactionType.BANK_SPEND -> {
                if (tx.deductFromBank != false) {
                    findAccount()?.let { BankEffect(it, -roundMoney(tx.amount)) }
                } else {
                    null
                }
            }
            TransactionType.CASHBACK -> {
                if (tx.cashbackDestination == CashbackDestination.BANK) {
                    findAccount()?.let { BankEffect(it, roundMoney(tx.amount)) }
                } else {
                    null
                }
            }
            TransactionType.SPEND -> null
        }
    }

    fun inferSpendingCategory(description: String): SpendingCategory {
        val normalized = description.trim().lowercase(Locale.ROOT)
        if (normalized.isEmpty()) return SpendingCategory.OTHER
        for ((cat, keywords) in CATEGORY_KEYWORDS) {
            if (keywords.any { normalized.contains(it) }) return cat
        }
        return SpendingCategory.OTHER
    }

    fun resolveTransactionCategory(tx: Transaction): SpendingCategory =
        tx.category ?: inferSpendingCategory(tx.description)

    fun buildBankSummaryFields(
        accounts: List<BankAccount>,
        nowIso: String = nowIsoString(),
    ): Triple<Double, String, List<BankAccount>> {
        val normalized = accounts.map { acc ->
            acc.copy(
                name = acc.name.trim().take(60).ifEmpty { "Bank Account" },
                balance = roundMoney(acc.balance),
                updatedAt = acc.updatedAt.ifEmpty { nowIso },
            )
        }
        val total = roundMoney(normalized.sumOf { it.balance })
        val bankName = when (normalized.size) {
            0 -> "No Bank Accounts"
            1 -> normalized[0].name
            else -> "${normalized.size} Bank Accounts"
        }
        return Triple(total, bankName, normalized)
    }

    fun createDefaultSettings(
        currency: CurrencyCode = CurrencyCode.INR,
        theme: ThemeMode = ThemeMode.DARK,
    ): AppSettings {
        val nowIso = nowIsoString()
        val primary = BankAccount(
            id = "bank-primary",
            name = "Primary Bank Account",
            balance = 0.0,
            updatedAt = nowIso,
        )
        val (total, bankName, accounts) = buildBankSummaryFields(listOf(primary), nowIso)
        return AppSettings(
            bankBalance = total,
            bankName = bankName,
            bankUpdatedAt = nowIso,
            bankAccounts = accounts,
            currency = currency,
            theme = theme,
            biometricLockEnabled = false,
        )
    }

    // ---- Formatting helpers ----

    fun formatMoney(
        amount: Double,
        currency: CurrencyCode = CurrencyCode.INR,
        compact: Boolean = false,
        showSign: Boolean = false,
    ): String {
        val isNegative = amount < 0.0
        val absVal = abs(amount)
        val hasDecimals = abs(absVal - round(absVal)) > 0.001

        val formattedNumber = if (compact && absVal >= 100_000.0) {
            when {
                currency == CurrencyCode.INR && absVal >= 10_000_000.0 ->
                    String.format(Locale.US, "%.1fCr", absVal / 10_000_000.0)
                currency == CurrencyCode.INR && absVal >= 100_000.0 ->
                    String.format(Locale.US, "%.1fL", absVal / 100_000.0)
                absVal >= 1_000_000.0 ->
                    String.format(Locale.US, "%.1fM", absVal / 1_000_000.0)
                else ->
                    String.format(Locale.US, "%.0fK", absVal / 1_000.0)
            }
        } else {
            val locale = Locale.forLanguageTag(currency.languageTag)
            val nf = NumberFormat.getNumberInstance(locale).apply {
                minimumFractionDigits = if (hasDecimals) 2 else 0
                maximumFractionDigits = 2
                isGroupingUsed = true
            }
            nf.format(absVal)
        }

        val withSymbol = "${currency.symbol}$formattedNumber"
        return when {
            isNegative -> "−$withSymbol"
            showSign && amount > 0.0 -> "+$withSymbol"
            else -> withSymbol
        }
    }

    fun formatShortDate(dateStr: String): String {
        if (!DATE_REGEX.matches(dateStr)) return dateStr
        val p = parseDateParts(dateStr)
        val monthName = SHORT_MONTHS.getOrElse(p.month - 1) { "" }
        return "${p.day} $monthName ${p.year}"
    }

    fun formatDayMonth(dateStr: String): String {
        if (!DATE_REGEX.matches(dateStr)) return dateStr
        val p = parseDateParts(dateStr)
        val monthName = SHORT_MONTHS.getOrElse(p.month - 1) { "" }
        return "${p.day} $monthName"
    }

    fun formatHeaderDate(dateStr: String): String {
        if (!DATE_REGEX.matches(dateStr)) return dateStr
        val p = parseDateParts(dateStr)
        val cal = Calendar.getInstance().apply {
            clear()
            set(p.year, p.month - 1, p.day)
        }
        val dayOfWeek = WEEKDAYS.getOrElse(cal.get(Calendar.DAY_OF_WEEK) - 1) { "" }
        val monthName = SHORT_MONTHS.getOrElse(p.month - 1) { "" }
        return "$dayOfWeek, ${p.day} $monthName"
    }

    fun formatOrdinalDay(day: Int): String {
        val mod100 = day % 100
        if (mod100 in 11..13) return "${day}th"
        return when (day % 10) {
            1 -> "${day}st"
            2 -> "${day}nd"
            3 -> "${day}rd"
            else -> "${day}th"
        }
    }

    fun formatDueCountdown(daysUntilDue: Int): String = when {
        daysUntilDue < -1 -> "Overdue by ${abs(daysUntilDue)} days"
        daysUntilDue == -1 -> "Overdue by 1 day"
        daysUntilDue == 0 -> "Due today"
        daysUntilDue == 1 -> "Due tomorrow"
        else -> "Due in $daysUntilDue days"
    }

    fun formatPaymentStatusLabel(status: PaymentStatus): String = when (status) {
        PaymentStatus.PAID -> "Paid"
        PaymentStatus.PARTIALLY_PAID -> "Partially Paid"
        PaymentStatus.OVERDUE -> "Overdue"
        PaymentStatus.UNPAID -> "Unpaid"
        PaymentStatus.NO_BILL -> "No Bill"
    }

    fun createSampleDataset(currentTheme: ThemeMode): Triple<AppSettings, List<CreditCard>, List<Transaction>> {
        val today = getTodayDateString()
        val nowIso = nowIsoString()
        val todayDay = parseDateParts(today).day

        val axisBillingDay = ((todayDay - 8 + 27) % 28) + 1
        val axisDueDay = ((axisBillingDay + 18 - 1) % 28) + 1
        val kiwiBillingDay = ((todayDay - 4 + 27) % 28) + 1
        val kiwiDueDay = ((kiwiBillingDay + 16 - 1) % 28) + 1
        val hdfcBillingDay = ((todayDay - 12 + 27) % 28) + 1
        val hdfcDueDay = ((hdfcBillingDay + 19 - 1) % 28) + 1

        val cards = listOf(
            CreditCard(
                id = "card-axis-ace",
                name = "Axis Ace",
                lastFour = "4821",
                limit = 150000.0,
                billingDay = axisBillingDay,
                dueDay = axisDueDay,
                colorToken = CardColorToken.TEAL,
                createdAt = nowIso,
            ),
            CreditCard(
                id = "card-kiwi-rupay",
                name = "Kiwi RuPay",
                lastFour = "9104",
                limit = 80000.0,
                billingDay = kiwiBillingDay,
                dueDay = kiwiDueDay,
                colorToken = CardColorToken.EMERALD,
                createdAt = nowIso,
            ),
            CreditCard(
                id = "card-hdfc-millennia",
                name = "HDFC Millennia",
                lastFour = "3376",
                limit = 200000.0,
                billingDay = hdfcBillingDay,
                dueDay = hdfcDueDay,
                colorToken = CardColorToken.INDIGO,
                createdAt = nowIso,
            ),
        )

        fun getCycles(bDay: Int, dDay: Int): Triple<CycleWindow, CycleWindow, CycleWindow> {
            val open = getCurrentOpenCycleWindow(today, bDay, dDay)
            val p = parseDateParts(open.statementDate)
            val (ly, lm) = shiftYearMonth(p.year, p.month, -1)
            val (py, pm) = shiftYearMonth(p.year, p.month, -2)
            return Triple(
                open,
                buildCycleWindow(ly, lm, bDay, dDay),
                buildCycleWindow(py, pm, bDay, dDay),
            )
        }

        val (axisOpen, axisLatest, axisPrev) = getCycles(axisBillingDay, axisDueDay)
        val (kiwiOpen, kiwiLatest, _) = getCycles(kiwiBillingDay, kiwiDueDay)
        val (hdfcOpen, hdfcLatest, hdfcPrev) = getCycles(hdfcBillingDay, hdfcDueDay)

        fun clampToday(d: String): String = if (d > today) today else d

        val transactions = listOf(
            Transaction(
                id = "tx-sample-1", cardId = "card-axis-ace", type = TransactionType.SPEND,
                amount = 6450.0, description = "Monthly Electricity & Fiber Broadband",
                category = SpendingCategory.BILLS, date = addDaysToDateString(axisPrev.cycleStart, 4),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-2", cardId = "card-axis-ace", type = TransactionType.PAYMENT,
                amount = 6450.0, description = "Axis Ace Previous Statement Settled",
                date = addDaysToDateString(axisPrev.statementDate, 5),
                statementCycleKey = axisPrev.cycleKey, deductFromBank = false,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-3", cardId = "card-axis-ace", type = TransactionType.SPEND,
                amount = 4280.0, description = "Grocery Restock & Fresh Produce",
                category = SpendingCategory.FOOD, date = addDaysToDateString(axisLatest.cycleStart, 5),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-4", cardId = "card-axis-ace", type = TransactionType.SPEND,
                amount = 3190.0, description = "Fuel Refill — Highway Station",
                category = SpendingCategory.FUEL, date = addDaysToDateString(axisLatest.statementDate, -2),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-5", cardId = "card-axis-ace", type = TransactionType.SPEND,
                amount = 1850.0, description = "Pharmacy & Wellness Supplies",
                category = SpendingCategory.HEALTH, date = clampToday(addDaysToDateString(axisOpen.cycleStart, 2)),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-6", cardId = "card-kiwi-rupay", type = TransactionType.SPEND,
                amount = 3800.0, description = "Local Supermarket UPI Scan",
                category = SpendingCategory.FOOD, date = addDaysToDateString(kiwiLatest.cycleStart, 6),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-7", cardId = "card-kiwi-rupay", type = TransactionType.SPEND,
                amount = 1450.0, description = "Coffee Roasters & Bakery",
                category = SpendingCategory.FOOD, date = addDaysToDateString(kiwiLatest.statementDate, -3),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-8", cardId = "card-kiwi-rupay", type = TransactionType.PAYMENT,
                amount = 2500.0, description = "Partial Payment via Bank Transfer",
                date = clampToday(addDaysToDateString(kiwiLatest.statementDate, 2)),
                statementCycleKey = kiwiLatest.cycleKey, deductFromBank = false,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-9", cardId = "card-kiwi-rupay", type = TransactionType.SPEND,
                amount = 920.0, description = "Metro Card Top-Up & Commute",
                category = SpendingCategory.TRAVEL, date = today,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-10", cardId = "card-hdfc-millennia", type = TransactionType.SPEND,
                amount = 11200.0, description = "Flight Booking — Domestic Roundtrip",
                category = SpendingCategory.TRAVEL, date = addDaysToDateString(hdfcPrev.cycleStart, 9),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-11", cardId = "card-hdfc-millennia", type = TransactionType.PAYMENT,
                amount = 11200.0, description = "HDFC Millennia Full Bill Paid",
                date = addDaysToDateString(hdfcPrev.statementDate, 6),
                statementCycleKey = hdfcPrev.cycleKey, deductFromBank = false,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-12", cardId = "card-hdfc-millennia", type = TransactionType.SPEND,
                amount = 8990.0, description = "Wireless Headphones & Desk Accessories",
                category = SpendingCategory.SHOPPING, date = addDaysToDateString(hdfcLatest.cycleStart, 10),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-13", cardId = "card-hdfc-millennia", type = TransactionType.SPEND,
                amount = 2499.0, description = "Annual Cloud Storage & Productivity Suite",
                category = SpendingCategory.BILLS, date = clampToday(addDaysToDateString(hdfcOpen.cycleStart, 3)),
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-14", cardId = "card-axis-ace", type = TransactionType.CASHBACK,
                amount = 380.0, description = "Axis Ace Utility & Dining Cashback",
                date = clampToday(addDaysToDateString(axisLatest.statementDate, 1)),
                statementCycleKey = axisLatest.cycleKey,
                cashbackDestination = CashbackDestination.STATEMENT,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-15", cardId = "", type = TransactionType.BANK_SPEND,
                amount = 640.0, description = "Local Vegetable Market & Kirana UPI",
                category = SpendingCategory.FOOD, date = today,
                bankAccountId = "bank-hdfc-savings", deductFromBank = true,
                createdAt = nowIso, updatedAt = nowIso,
            ),
            Transaction(
                id = "tx-sample-16", cardId = "", type = TransactionType.BANK_SPEND,
                amount = 220.0, description = "Auto Rickshaw & Local Commute UPI",
                category = SpendingCategory.TRAVEL, date = addDaysToDateString(today, -1),
                bankAccountId = "bank-sbi-salary", deductFromBank = true,
                createdAt = nowIso, updatedAt = nowIso,
            ),
        )

        val accounts = listOf(
            BankAccount("bank-hdfc-savings", "HDFC Savings", 62500.0, nowIso),
            BankAccount("bank-sbi-salary", "SBI Salary", 24000.0, nowIso),
        )
        val (total, bankName, normalizedAccounts) = buildBankSummaryFields(accounts, nowIso)
        val settings = AppSettings(
            bankBalance = total,
            bankName = bankName,
            bankUpdatedAt = nowIso,
            bankAccounts = normalizedAccounts,
            currency = CurrencyCode.INR,
            theme = currentTheme,
            biometricLockEnabled = false,
        )

        return Triple(settings, cards, transactions)
    }
}
