package com.rahul2327.cardledger.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BarChart
import androidx.compose.material.icons.rounded.PieChart
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.SpendingCategory
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily
import com.rahul2327.cardledger.ui.theme.chartColor
import com.rahul2327.cardledger.ui.theme.swatchColor
import java.util.Locale
import kotlin.math.max
import kotlin.math.round

private enum class ChartTimeRange(val label: String) {
    THIS_MONTH("This Month"),
    THREE_M("3M"),
    SIX_M("6M"),
    ALL("All"),
}

private data class CategorySlice(
    val category: SpendingCategory,
    val amount: Double,
    val count: Int,
    val percent: Double,
)

private data class MonthlyBucket(
    val monthKey: String,
    val shortLabel: String,
    val fullLabel: String,
    val spend: Double,
    val payment: Double,
    val cashback: Double,
)

private data class SourceSlice(
    val id: String,
    val name: String,
    val color: Color,
    val amount: Double,
    val percent: Double,
)

private val SHORT_MONTHS = listOf(
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)

private fun monthKeyOf(year: Int, month: Int): String =
    String.format(Locale.US, "%04d-%02d", year, month)

@Composable
fun SpendingChartsSection(
    cards: List<CreditCard>,
    bankAccounts: List<BankAccount>,
    transactions: List<Transaction>,
    currency: CurrencyCode,
    todayDate: String,
) {
    if (transactions.isEmpty()) return

    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val isDark = extras.isDark

    var timeRange by remember { mutableStateOf(ChartTimeRange.SIX_M) }
    var selectedCategory by remember { mutableStateOf<SpendingCategory?>(null) }
    var selectedMonthKey by remember { mutableStateOf<String?>(null) }

    val todayParts = remember(todayDate) { FinanceEngine.parseDateParts(todayDate) }

    val rangeStartMonthKey = remember(timeRange, todayParts) {
        when (timeRange) {
            ChartTimeRange.ALL -> null
            ChartTimeRange.THIS_MONTH -> monthKeyOf(todayParts.year, todayParts.month)
            ChartTimeRange.THREE_M -> {
                val (y, m) = FinanceEngine.shiftYearMonth(todayParts.year, todayParts.month, -2)
                monthKeyOf(y, m)
            }
            ChartTimeRange.SIX_M -> {
                val (y, m) = FinanceEngine.shiftYearMonth(todayParts.year, todayParts.month, -5)
                monthKeyOf(y, m)
            }
        }
    }

    val filteredSpends = remember(transactions, rangeStartMonthKey) {
        transactions.filter { tx ->
            (tx.type == TransactionType.SPEND || tx.type == TransactionType.BANK_SPEND) &&
                (rangeStartMonthKey == null || tx.date.take(7) >= rangeStartMonthKey)
        }
    }

    val cardSpendTotal = remember(filteredSpends) {
        FinanceEngine.roundMoney(filteredSpends.filter { it.type == TransactionType.SPEND }.sumOf { it.amount })
    }
    val bankSpendTotal = remember(filteredSpends) {
        FinanceEngine.roundMoney(filteredSpends.filter { it.type == TransactionType.BANK_SPEND }.sumOf { it.amount })
    }

    val categoryData = remember(filteredSpends) {
        val map = LinkedHashMap<SpendingCategory, Pair<Double, Int>>()
        var total = 0.0
        for (tx in filteredSpends) {
            val cat = FinanceEngine.resolveTransactionCategory(tx)
            val prev = map[cat] ?: (0.0 to 0)
            map[cat] = FinanceEngine.roundMoney(prev.first + tx.amount) to (prev.second + 1)
            total = FinanceEngine.roundMoney(total + tx.amount)
        }
        val list = map.entries
            .map { (cat, stats) ->
                val pct = if (total > 0.0) round((stats.first / total) * 1000.0) / 10.0 else 0.0
                CategorySlice(cat, stats.first, stats.second, pct)
            }
            .sortedByDescending { it.amount }
        total to list
    }

    val totalCategorySpend = categoryData.first
    val categorySlices = categoryData.second
    val activeCategorySlice = selectedCategory?.let { sel ->
        categorySlices.firstOrNull { it.category == sel }
    }

    val monthlyData = remember(transactions, timeRange, todayParts) {
        val count = if (timeRange == ChartTimeRange.THREE_M) 3 else 6
        val list = mutableListOf<MonthlyBucket>()
        val spendMap = HashMap<String, Double>()
        val payMap = HashMap<String, Double>()
        val cbMap = HashMap<String, Double>()

        for (tx in transactions) {
            val key = tx.date.take(7)
            when (tx.type) {
                TransactionType.SPEND, TransactionType.BANK_SPEND ->
                    spendMap[key] = FinanceEngine.roundMoney((spendMap[key] ?: 0.0) + tx.amount)
                TransactionType.PAYMENT ->
                    payMap[key] = FinanceEngine.roundMoney((payMap[key] ?: 0.0) + tx.amount)
                TransactionType.CASHBACK ->
                    cbMap[key] = FinanceEngine.roundMoney((cbMap[key] ?: 0.0) + tx.amount)
            }
        }

        for (i in (count - 1) downTo 0) {
            val (y, m) = FinanceEngine.shiftYearMonth(todayParts.year, todayParts.month, -i)
            val key = monthKeyOf(y, m)
            val mName = SHORT_MONTHS.getOrElse(m - 1) { "" }
            list.add(
                MonthlyBucket(
                    monthKey = key,
                    shortLabel = mName,
                    fullLabel = "$mName $y",
                    spend = spendMap[key] ?: 0.0,
                    payment = payMap[key] ?: 0.0,
                    cashback = cbMap[key] ?: 0.0,
                ),
            )
        }
        val maxVal = max(1.0, list.maxOfOrNull { max(it.spend, it.payment) } ?: 1.0)
        list to maxVal
    }

    val monthlyBuckets = monthlyData.first
    val monthlyMax = monthlyData.second
    val activeMonth = remember(selectedMonthKey, monthlyBuckets) {
        selectedMonthKey?.let { key -> monthlyBuckets.firstOrNull { it.monthKey == key } }
            ?: monthlyBuckets.lastOrNull { it.spend > 0.0 || it.payment > 0.0 || it.cashback > 0.0 }
            ?: monthlyBuckets.lastOrNull()
    }

    val sourceSlices = remember(cards, bankAccounts, filteredSpends, isDark) {
        val cardMap = cards.associateBy { it.id }
        val bankMap = bankAccounts.associateBy { it.id }
        val map = LinkedHashMap<String, Triple<String, Color, Double>>()
        var grandTotal = 0.0

        for (tx in filteredSpends) {
            grandTotal = FinanceEngine.roundMoney(grandTotal + tx.amount)
            if (tx.type == TransactionType.BANK_SPEND) {
                val bank = tx.bankAccountId?.let { bankMap[it] } ?: bankAccounts.firstOrNull()
                val key = if (bank != null) "bank:${bank.id}" else "bank:other"
                val name = if (bank != null) "${bank.name} (UPI/Bank)" else "Bank / UPI"
                val prev = map[key] ?: Triple(name, Color(0xFF0EA5E9), 0.0)
                map[key] = prev.copy(third = FinanceEngine.roundMoney(prev.third + tx.amount))
            } else {
                val card = cardMap[tx.cardId]
                val key = "card:${tx.cardId}"
                val color = card?.colorToken?.swatchColor(isDark) ?: Color(0xFF0B57D0)
                val prev = map[key] ?: Triple(card?.name ?: "Credit Card", color, 0.0)
                map[key] = prev.copy(third = FinanceEngine.roundMoney(prev.third + tx.amount))
            }
        }
        if (grandTotal <= 0.0) return@remember emptyList<SourceSlice>()
        val items = map.entries
            .filter { it.value.third > 0.0 }
            .map { (id, info) ->
                SourceSlice(
                    id = id,
                    name = info.first,
                    color = info.second,
                    amount = info.third,
                    percent = round((info.third / grandTotal) * 1000.0) / 10.0,
                )
            }
            .sortedByDescending { it.amount }
        if (items.size >= 2) items else emptyList()
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Section header + timeframe selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Spending Insights",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = cs.onSurface,
                )
                Text(
                    text = "Categories & monthly trends",
                    fontSize = 12.sp,
                    color = cs.onSurfaceVariant,
                )
            }
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(extras.surfaceCard)
                    .border(1.dp, cs.outlineVariant.copy(alpha = 0.55f), RoundedCornerShape(50))
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                ChartTimeRange.entries.forEach { range ->
                    val active = timeRange == range
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(if (active) cs.secondaryContainer else Color.Transparent)
                            .clickable {
                                timeRange = range
                                selectedCategory = null
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Text(
                            text = range.label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (active) cs.onSecondaryContainer else cs.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                }
            }
        }

        // Card 1: Spending by Category Donut + Ranked Bars
        LedgerCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Spending by Category",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    val splitLine = if (bankSpendTotal > 0.0 && cardSpendTotal > 0.0) {
                        "${filteredSpends.size} expenses · Cards ${FinanceEngine.formatMoney(cardSpendTotal, currency)} · UPI ${FinanceEngine.formatMoney(bankSpendTotal, currency)}"
                    } else {
                        "${filteredSpends.size} ${if (filteredSpends.size == 1) "expense" else "expenses"} · Tap a category to focus"
                    }
                    Text(
                        text = splitLine,
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                Icon(
                    imageVector = Icons.Rounded.PieChart,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(18.dp),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (categorySlices.isEmpty()) {
                Text(
                    text = "No spending recorded in this period.",
                    fontSize = 12.sp,
                    color = cs.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 20.dp),
                )
            } else {
                // Centered Donut Chart
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier.size(152.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        val trackColor = extras.surfaceHigh
                        Canvas(modifier = Modifier.size(152.dp)) {
                            val baseStroke = 22.dp.toPx()
                            drawArc(
                                color = trackColor,
                                startAngle = 0f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = baseStroke, cap = StrokeCap.Butt),
                            )
                            var startAngle = -90f
                            val gapDegrees = if (categorySlices.size > 1) 2.5f else 0f
                            for (slice in categorySlices) {
                                val sweep = if (totalCategorySpend > 0.0) {
                                    ((slice.amount / totalCategorySpend) * 360.0).toFloat()
                                } else {
                                    0f
                                }
                                val isFocused = selectedCategory == null || selectedCategory == slice.category
                                val isSelected = selectedCategory == slice.category
                                val color = slice.category.chartColor(isDark)
                                    .copy(alpha = if (isFocused) 1f else 0.25f)
                                val drawSweep = max(0f, sweep - gapDegrees)
                                if (drawSweep > 0f) {
                                    drawArc(
                                        color = color,
                                        startAngle = startAngle,
                                        sweepAngle = drawSweep,
                                        useCenter = false,
                                        style = Stroke(
                                            width = if (isSelected) baseStroke + 3.dp.toPx() else baseStroke,
                                            cap = StrokeCap.Butt,
                                        ),
                                    )
                                }
                                startAngle += sweep
                            }
                        }

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(horizontal = 24.dp),
                        ) {
                            Text(
                                text = activeCategorySlice?.category?.shortLabel ?: "Total Spend",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = cs.onSurfaceVariant,
                                maxLines = 1,
                            )
                            Text(
                                text = FinanceEngine.formatMoney(
                                    activeCategorySlice?.amount ?: totalCategorySpend,
                                    currency,
                                ),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = MonoFontFamily,
                                color = cs.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            if (activeCategorySlice != null) {
                                Text(
                                    text = "${activeCategorySlice.percent}%",
                                    fontSize = 11.sp,
                                    fontFamily = MonoFontFamily,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.primary,
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    categorySlices.forEach { slice ->
                        val active = selectedCategory == slice.category
                        val barColor = slice.category.chartColor(isDark)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (active) extras.surfaceHigh else Color.Transparent)
                                .clickable {
                                    selectedCategory = if (active) null else slice.category
                                }
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(9.dp)
                                            .clip(CircleShape)
                                            .background(barColor),
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "${slice.category.label} (${slice.count})",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = cs.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(
                                        text = "${slice.percent}%",
                                        fontSize = 11.sp,
                                        fontFamily = MonoFontFamily,
                                        color = cs.onSurfaceVariant,
                                    )
                                    Text(
                                        text = FinanceEngine.formatMoney(slice.amount, currency),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        fontFamily = MonoFontFamily,
                                        color = cs.onSurface,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(extras.surfaceHigh),
                            ) {
                                val fraction = (slice.percent / 100.0).toFloat().coerceIn(0.04f, 1f)
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(fraction)
                                        .fillMaxHeight()
                                        .clip(RoundedCornerShape(50))
                                        .background(barColor),
                                )
                            }
                        }
                    }
                }
            }
        }

        // Card 2: Monthly Spend vs Paid Bar Graph (+ Source Breakdown)
        LedgerCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Monthly Spend vs. Paid",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    Text(
                        text = "Tap any month to inspect totals",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                Icon(
                    imageVector = Icons.Rounded.BarChart,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(18.dp),
                )
            }

            if (activeMonth != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(extras.surfaceLow)
                        .border(1.dp, cs.outlineVariant.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                        .padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = activeMonth.fullLabel,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(cs.primary),
                            )
                            Text(
                                text = FinanceEngine.formatMoney(activeMonth.spend, currency),
                                fontSize = 12.sp,
                                fontFamily = MonoFontFamily,
                                fontWeight = FontWeight.Medium,
                                color = cs.onSurface,
                            )
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(extras.success),
                            )
                            Text(
                                text = FinanceEngine.formatMoney(activeMonth.payment, currency),
                                fontSize = 12.sp,
                                fontFamily = MonoFontFamily,
                                fontWeight = FontWeight.Medium,
                                color = extras.success,
                            )
                        }
                        if (activeMonth.cashback > 0.0) {
                            Text(
                                text = "+${FinanceEngine.formatMoney(activeMonth.cashback, currency)} CB",
                                fontSize = 11.sp,
                                fontFamily = MonoFontFamily,
                                fontWeight = FontWeight.Medium,
                                color = extras.success,
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                monthlyBuckets.forEach { bucket ->
                    val isActive = activeMonth?.monthKey == bucket.monthKey
                    val spendFraction = if (bucket.spend > 0.0) {
                        (bucket.spend / monthlyMax).toFloat().coerceIn(0.08f, 1f)
                    } else {
                        0f
                    }
                    val payFraction = if (bucket.payment > 0.0) {
                        (bucket.payment / monthlyMax).toFloat().coerceIn(0.08f, 1f)
                    } else {
                        0f
                    }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isActive) extras.surfaceHigh.copy(alpha = 0.7f) else Color.Transparent)
                            .clickable { selectedMonthKey = bucket.monthKey }
                            .padding(vertical = 6.dp, horizontal = 2.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Bottom,
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally),
                            verticalAlignment = Alignment.Bottom,
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(12.dp)
                                    .then(
                                        if (spendFraction > 0f) Modifier.fillMaxHeight(spendFraction)
                                        else Modifier.height(3.dp),
                                    )
                                    .clip(RoundedCornerShape(topStart = 5.dp, topEnd = 5.dp))
                                    .background(
                                        if (spendFraction > 0f) cs.primary
                                        else cs.outlineVariant.copy(alpha = 0.4f),
                                    ),
                            )
                            Box(
                                modifier = Modifier
                                    .width(12.dp)
                                    .then(
                                        if (payFraction > 0f) Modifier.fillMaxHeight(payFraction)
                                        else Modifier.height(3.dp),
                                    )
                                    .clip(RoundedCornerShape(topStart = 5.dp, topEnd = 5.dp))
                                    .background(
                                        if (payFraction > 0f) extras.success
                                        else cs.outlineVariant.copy(alpha = 0.4f),
                                    ),
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = bucket.shortLabel,
                            fontSize = 11.sp,
                            fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (isActive) cs.onSurface else cs.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(cs.primary),
                    )
                    Text("Total Spend", fontSize = 11.sp, color = cs.onSurfaceVariant)
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(extras.success),
                    )
                    Text("CC Paid", fontSize = 11.sp, color = cs.onSurfaceVariant)
                }
            }

            if (sourceSlices.isNotEmpty()) {
                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Spending by Source",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = cs.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    sourceSlices.forEach { src ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    text = src.name,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${FinanceEngine.formatMoney(src.amount, currency)} (${src.percent}%)",
                                    fontSize = 12.sp,
                                    fontFamily = MonoFontFamily,
                                    color = cs.onSurfaceVariant,
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(extras.surfaceHigh),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth((src.percent / 100.0).toFloat().coerceIn(0.04f, 1f))
                                        .fillMaxHeight()
                                        .clip(RoundedCornerShape(50))
                                        .background(src.color),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
