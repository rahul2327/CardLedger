package com.rahul2327.cardledger.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.DashboardSummary
import com.rahul2327.cardledger.model.NavTab
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionModalPreset
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.components.LedgerCard
import com.rahul2327.cardledger.ui.components.SpendingChartsSection
import com.rahul2327.cardledger.ui.components.TransactionRowItem
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily
import com.rahul2327.cardledger.ui.theme.accentColor
import com.rahul2327.cardledger.ui.theme.softBgColor
import com.rahul2327.cardledger.ui.theme.swatchColor
import kotlin.math.abs

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DashboardScreen(
    settings: AppSettings,
    summary: DashboardSummary,
    transactions: List<Transaction>,
    todayDate: String,
    onNavigate: (NavTab) -> Unit,
    onSelectCardDetail: (String) -> Unit,
    onEditBankBalance: () -> Unit,
    onAddCard: () -> Unit,
    onOpenTransactionModal: (TransactionModalPreset) -> Unit,
    onEditTransaction: (Transaction) -> Unit,
    onDeleteTransaction: (Transaction) -> Unit,
    onLoadSampleData: () -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency
    val isShortfall = summary.balanceAfterCCPayments < 0.0
    val cardById = remember(summary.cardSummaries) {
        summary.cardSummaries.associate { it.card.id to it.card }
    }
    val recentTxs = remember(transactions) { transactions.take(6) }

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // 1. Bank Balance Card
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Bank Balance",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = cs.onSurfaceVariant,
                        )
                        Text(
                            text = settings.bankName,
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    FilledTonalButton(
                        onClick = onEditBankBalance,
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        modifier = Modifier.height(36.dp),
                    ) {
                        Icon(Icons.Rounded.Edit, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (settings.bankAccounts.size > 1) "Manage" else "Update",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = FinanceEngine.formatMoney(summary.bankBalance, currency),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = MonoFontFamily,
                    color = cs.onSurface,
                )
                if (settings.bankAccounts.size > 1) {
                    Spacer(modifier = Modifier.height(10.dp))
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        settings.bankAccounts.take(3).forEach { acc ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    text = acc.name,
                                    fontSize = 12.sp,
                                    color = cs.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    text = FinanceEngine.formatMoney(acc.balance, currency),
                                    fontSize = 12.sp,
                                    fontFamily = MonoFontFamily,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                )
                            }
                        }
                        if (settings.bankAccounts.size > 3) {
                            Text(
                                text = "+${settings.bankAccounts.size - 3} more accounts",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = cs.primary,
                                modifier = Modifier
                                    .clickable { onEditBankBalance() }
                                    .padding(top = 2.dp),
                            )
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (settings.bankAccounts.isEmpty()) "Tap Update to add a bank account"
                        else "Available cash on hand",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
            }
        }

        // 2. Total CC Outstanding Card
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Total CC Outstanding",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = cs.onSurfaceVariant,
                    )
                    Icon(
                        imageVector = Icons.Rounded.CreditCard,
                        contentDescription = null,
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = FinanceEngine.formatMoney(summary.totalCCOutstanding, currency),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = MonoFontFamily,
                    color = cs.onSurface,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${FinanceEngine.formatMoney(summary.upcomingCCBills, currency)} billed · ${FinanceEngine.formatMoney(summary.currentUnbilledTotal, currency)} unbilled",
                    fontSize = 12.sp,
                    color = cs.onSurfaceVariant,
                )
                if (summary.totalCashback > 0.0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.AutoAwesome,
                            contentDescription = null,
                            tint = extras.success,
                            modifier = Modifier.size(13.dp),
                        )
                        Text(
                            text = "${FinanceEngine.formatMoney(summary.totalCashback, currency)} cashback earned",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = extras.success,
                        )
                    }
                }
            }
        }

        // 3. Upcoming CC Bills Card
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Upcoming CC Bills",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = cs.onSurfaceVariant,
                    )
                    Icon(
                        imageVector = Icons.Rounded.ReceiptLong,
                        contentDescription = null,
                        tint = cs.tertiary,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = FinanceEngine.formatMoney(summary.upcomingCCBills, currency),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = MonoFontFamily,
                    color = cs.onSurface,
                )
                Spacer(modifier = Modifier.height(4.dp))
                val dueSub = if (summary.upcomingDueBills.isNotEmpty()) {
                    val count = summary.upcomingDueBills.size
                    val nextDue = FinanceEngine.formatDayMonth(summary.upcomingDueBills[0].statement.dueDate)
                    "$count ${if (count == 1) "unpaid bill" else "unpaid bills"} · Next $nextDue"
                } else {
                    "All generated statements settled"
                }
                Text(text = dueSub, fontSize = 12.sp, color = cs.onSurfaceVariant)
            }
        }

        // 4. Balance After CC Payments Focal Card
        item {
            val containerColor = if (isShortfall) cs.errorContainer else cs.primaryContainer
            val contentColor = if (isShortfall) cs.onErrorContainer else cs.onPrimaryContainer
            LedgerCard(
                containerColor = containerColor,
                borderColor = (if (isShortfall) cs.error else cs.primary).copy(alpha = 0.25f),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Balance After CC Payments",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = contentColor.copy(alpha = 0.9f),
                    )
                    Icon(
                        imageVector = Icons.Rounded.AccountBalance,
                        contentDescription = null,
                        tint = contentColor.copy(alpha = 0.85f),
                        modifier = Modifier.size(18.dp),
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = FinanceEngine.formatMoney(summary.balanceAfterCCPayments, currency),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = MonoFontFamily,
                    color = contentColor,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (isShortfall) {
                        Icon(
                            imageVector = Icons.Rounded.ErrorOutline,
                            contentDescription = null,
                            tint = contentColor,
                            modifier = Modifier.size(15.dp),
                        )
                    }
                    Text(
                        text = if (isShortfall) "Shortfall — CC dues exceed bank balance"
                        else "Bank balance minus total CC dues",
                        fontSize = 12.sp,
                        color = contentColor.copy(alpha = 0.85f),
                    )
                }
            }
        }

        // First-time empty onboarding or active ledger sections
        if (summary.cardSummaries.isEmpty()) {
            item {
                LedgerCard(contentPadding = PaddingValues(24.dp)) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(cs.primaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.CreditCard,
                                contentDescription = null,
                                tint = cs.onPrimaryContainer,
                            )
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Track your credit cards, cashback & bank UPI offline",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onSurface,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Add your credit cards with billing and due dates, track cashback and direct bank/UPI spending, and keep all data privately on your phone.",
                            fontSize = 13.sp,
                            color = cs.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Button(
                                onClick = onAddCard,
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = cs.primaryContainer,
                                    contentColor = cs.onPrimaryContainer,
                                ),
                            ) {
                                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Add First Card", fontSize = 13.sp)
                            }
                            if (settings.bankAccounts.isNotEmpty()) {
                                FilledTonalButton(
                                    onClick = { onOpenTransactionModal(TransactionModalPreset(type = TransactionType.BANK_SPEND)) },
                                    shape = RoundedCornerShape(50),
                                ) {
                                    Icon(Icons.Rounded.AccountBalance, contentDescription = null, modifier = Modifier.size(15.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Add Bank / UPI Spend", fontSize = 13.sp)
                                }
                            }
                            FilledTonalButton(
                                onClick = onLoadSampleData,
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = extras.surfaceHigh,
                                    contentColor = cs.onSurface,
                                ),
                            ) {
                                Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = cs.primary, modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Load Sample Data", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            if (transactions.isNotEmpty()) {
                item {
                    SpendingChartsSection(
                        cards = emptyList(),
                        bankAccounts = settings.bankAccounts,
                        transactions = transactions,
                        currency = currency,
                        todayDate = todayDate,
                    )
                }
            }
        } else {
            // Spending Insights Charts
            if (transactions.isNotEmpty()) {
                item {
                    SpendingChartsSection(
                        cards = summary.cardSummaries.map { it.card },
                        bankAccounts = settings.bankAccounts,
                        transactions = transactions,
                        currency = currency,
                        todayDate = todayDate,
                    )
                }
            }

            // Credit Cards Overview
            item {
                LedgerCard(contentPadding = PaddingValues(0.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 18.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = "Credit Cards Overview",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "${summary.cardSummaries.size} ${if (summary.cardSummaries.size == 1) "card" else "cards"} tracked locally",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { onNavigate(NavTab.CARDS) }) {
                            Text("Manage", fontSize = 12.sp)
                            Icon(Icons.Rounded.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    }
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                    summary.cardSummaries.forEachIndexed { idx, cardSummary ->
                        val isOverLimit = cardSummary.remainingLimit != null && cardSummary.remainingLimit < 0.0
                        val utilPct = cardSummary.utilizationPercent?.coerceAtMost(100.0)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectCardDetail(cardSummary.card.id) }
                                .padding(horizontal = 18.dp, vertical = 14.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(cardSummary.card.colorToken.softBgColor(extras.isDark)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = cardSummary.card.name.take(2).uppercase(),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = cardSummary.card.colorToken.accentColor(extras.isDark),
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = buildString {
                                            append(cardSummary.card.name)
                                            if (cardSummary.card.lastFour.isNotEmpty()) {
                                                append(" ••${cardSummary.card.lastFour}")
                                            }
                                        },
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = cs.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        text = buildString {
                                            append("Bills ${FinanceEngine.formatOrdinalDay(cardSummary.card.billingDay)} · Due ${FinanceEngine.formatOrdinalDay(cardSummary.card.dueDay)}")
                                            if (cardSummary.upcomingBillAmount > 0.0) {
                                                append(" · Bill ${FinanceEngine.formatMoney(cardSummary.upcomingBillAmount, currency)}")
                                            }
                                        },
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = FinanceEngine.formatMoney(cardSummary.currentOutstanding, currency),
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        fontFamily = MonoFontFamily,
                                        color = cs.onSurface,
                                    )
                                    Text(
                                        text = if (cardSummary.remainingLimit != null) {
                                            if (isOverLimit) "Over by ${FinanceEngine.formatMoney(abs(cardSummary.remainingLimit), currency)}"
                                            else "Avail ${FinanceEngine.formatMoney(cardSummary.remainingLimit, currency, compact = true)}"
                                        } else {
                                            "Unbilled ${FinanceEngine.formatMoney(cardSummary.currentUnbilledAmount, currency)}"
                                        },
                                        fontSize = 11.sp,
                                        color = if (isOverLimit) cs.error else cs.onSurfaceVariant,
                                    )
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(
                                    onClick = {
                                        onOpenTransactionModal(
                                            TransactionModalPreset(
                                                type = TransactionType.SPEND,
                                                cardId = cardSummary.card.id,
                                            ),
                                        )
                                    },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(extras.surfaceHigh),
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.Add,
                                        contentDescription = "Add spend on ${cardSummary.card.name}",
                                        tint = cs.onSurface,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }

                            if (utilPct != null) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(50))
                                        .background(extras.surfaceHigh),
                                ) {
                                    val barColor = when {
                                        isOverLimit || utilPct >= 80.0 -> cs.error
                                        utilPct >= 50.0 -> cs.tertiary
                                        else -> cardSummary.card.colorToken.swatchColor(extras.isDark)
                                    }
                                    val barFraction = if (cardSummary.currentOutstanding > 0.0) {
                                        (utilPct / 100.0).toFloat().coerceIn(0.02f, 1f)
                                    } else {
                                        0f
                                    }
                                    if (barFraction > 0f) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth(barFraction)
                                                .fillMaxHeight()
                                                .clip(RoundedCornerShape(50))
                                                .background(barColor),
                                        )
                                    }
                                }
                            }
                        }
                        if (idx < summary.cardSummaries.lastIndex) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                        }
                    }
                }
            }

            // Upcoming Payment Dates
            item {
                LedgerCard(contentPadding = PaddingValues(0.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 18.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = "Upcoming Payment Dates",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "Generated bills awaiting settlement",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { onNavigate(NavTab.BILLS) }) {
                            Text("All Bills", fontSize = 12.sp)
                            Icon(Icons.Rounded.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    }
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                    if (summary.upcomingDueBills.isEmpty()) {
                        Row(
                            modifier = Modifier.padding(18.dp),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(extras.successContainer),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.CheckCircle,
                                    contentDescription = null,
                                    tint = extras.onSuccessContainer,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                            Column {
                                Text(
                                    text = "No unpaid generated statements",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                )
                                Text(
                                    text = "You are caught up on all generated credit card bills.",
                                    fontSize = 12.sp,
                                    color = cs.onSurfaceVariant,
                                )
                            }
                        }
                    } else {
                        summary.upcomingDueBills.forEachIndexed { idx, item ->
                            val isOverdue = item.daysUntilDue < 0
                            val isUrgent = item.daysUntilDue in 0..5
                            val dueColor = when {
                                isOverdue -> cs.error
                                isUrgent -> cs.tertiary
                                else -> cs.onSurfaceVariant
                            }
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 18.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(9.dp)
                                                    .clip(CircleShape)
                                                    .background(item.card.colorToken.swatchColor(extras.isDark)),
                                            )
                                            Text(
                                                text = item.card.name,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = cs.onSurface,
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Text(
                                            text = "Statement ${FinanceEngine.formatDayMonth(item.statement.statementDate)} · Due ${FinanceEngine.formatShortDate(item.statement.dueDate)}",
                                            fontSize = 12.sp,
                                            color = cs.onSurfaceVariant,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            text = FinanceEngine.formatMoney(item.statement.remainingAmount, currency),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            fontFamily = MonoFontFamily,
                                            color = cs.onSurface,
                                        )
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            Icon(
                                                imageVector = if (isOverdue) Icons.Rounded.ErrorOutline else Icons.Rounded.Schedule,
                                                contentDescription = null,
                                                tint = dueColor,
                                                modifier = Modifier.size(13.dp),
                                            )
                                            Text(
                                                text = FinanceEngine.formatDueCountdown(item.daysUntilDue),
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = dueColor,
                                            )
                                        }
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = buildString {
                                            append(FinanceEngine.formatPaymentStatusLabel(item.statement.status))
                                            if (item.statement.paidAmount > 0.0) {
                                                append(" · Paid ${FinanceEngine.formatMoney(item.statement.paidAmount, currency)}")
                                            }
                                        },
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                    )
                                    Button(
                                        onClick = {
                                            onOpenTransactionModal(
                                                TransactionModalPreset(
                                                    type = TransactionType.PAYMENT,
                                                    cardId = item.card.id,
                                                    amount = item.statement.remainingAmount,
                                                    description = "${item.card.name} Statement Payment",
                                                    statementCycleKey = item.statement.cycleKey,
                                                ),
                                            )
                                        },
                                        shape = RoundedCornerShape(50),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = cs.primaryContainer,
                                            contentColor = cs.onPrimaryContainer,
                                        ),
                                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                        modifier = Modifier.height(34.dp),
                                    ) {
                                        Text("Pay Bill", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                            if (idx < summary.upcomingDueBills.lastIndex) {
                                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                            }
                        }
                    }
                }
            }

            // Recent Transactions
            item {
                LedgerCard(contentPadding = PaddingValues(0.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 18.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = "Recent Transactions",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "Latest card, bank UPI, cashback & bill entries",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { onNavigate(NavTab.HISTORY) }) {
                            Text("View All", fontSize = 12.sp)
                            Icon(Icons.Rounded.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    }
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                    if (recentTxs.isEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text("No transactions recorded yet.", fontSize = 13.sp, color = cs.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = { onOpenTransactionModal(TransactionModalPreset(type = TransactionType.SPEND)) },
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = cs.primaryContainer,
                                    contentColor = cs.onPrimaryContainer,
                                ),
                            ) {
                                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Add First Entry", fontSize = 13.sp)
                            }
                        }
                    } else {
                        recentTxs.forEachIndexed { idx, tx ->
                            TransactionRowItem(
                                tx = tx,
                                cardById = cardById,
                                bankAccounts = settings.bankAccounts,
                                currency = currency,
                                todayDate = todayDate,
                                onEdit = onEditTransaction,
                                onDelete = onDeleteTransaction,
                            )
                            if (idx < recentTxs.lastIndex) {
                                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                            }
                        }
                    }
                }
            }

            // Current Cycle Spending (Unbilled)
            item {
                LedgerCard(contentPadding = PaddingValues(0.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 18.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = "Current Cycle Spending",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "Unbilled activity — not yet generated",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                        Icon(
                            imageVector = Icons.Rounded.CalendarMonth,
                            contentDescription = null,
                            tint = cs.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                    summary.cardSummaries.forEachIndexed { idx, cardSummary ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 18.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = cardSummary.card.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = "Next bill ${FinanceEngine.formatDayMonth(cardSummary.nextStatementDate)} · ${cardSummary.unbilledTransactionCount} ${if (cardSummary.unbilledTransactionCount == 1) "entry" else "entries"}",
                                    fontSize = 12.sp,
                                    color = cs.onSurfaceVariant,
                                )
                            }
                            Text(
                                text = FinanceEngine.formatMoney(cardSummary.currentUnbilledAmount, currency),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = MonoFontFamily,
                                color = cs.onSurface,
                            )
                        }
                        if (idx < summary.cardSummaries.lastIndex) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                        }
                    }
                }
            }
        }
    }
}
