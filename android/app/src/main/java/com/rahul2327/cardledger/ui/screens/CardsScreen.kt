package com.rahul2327.cardledger.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.rahul2327.cardledger.model.CardSummary
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionModalPreset
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.components.LedgerCard
import com.rahul2327.cardledger.ui.components.StatusInlineBadge
import com.rahul2327.cardledger.ui.components.TransactionRowItem
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily
import com.rahul2327.cardledger.ui.theme.accentColor
import com.rahul2327.cardledger.ui.theme.softBgColor
import com.rahul2327.cardledger.ui.theme.swatchColor
import kotlin.math.abs

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CardsScreen(
    settings: AppSettings,
    cardSummaries: List<CardSummary>,
    transactions: List<Transaction>,
    selectedCardId: String?,
    todayDate: String,
    onSelectCard: (String) -> Unit,
    onAddCard: () -> Unit,
    onEditCard: (CreditCard) -> Unit,
    onDeleteCard: (CreditCard) -> Unit,
    onOpenTransactionModal: (TransactionModalPreset) -> Unit,
    onEditTransaction: (Transaction) -> Unit,
    onDeleteTransaction: (Transaction) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency

    val cardById = remember(cardSummaries) {
        cardSummaries.associate { it.card.id to it.card }
    }

    val activeSummary = remember(cardSummaries, selectedCardId) {
        cardSummaries.firstOrNull { it.card.id == selectedCardId } ?: cardSummaries.firstOrNull()
    }

    val activeCardTransactions = remember(transactions, activeSummary?.card?.id) {
        val id = activeSummary?.card?.id ?: return@remember emptyList()
        transactions.filter { it.cardId == id }
    }

    if (cardSummaries.isEmpty() || activeSummary == null) {
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        ) {
            item {
                LedgerCard(contentPadding = PaddingValues(24.dp)) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
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
                            text = "No credit cards added yet",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onSurface,
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Add your credit cards with their billing and due days to track cycles, statements, cashback, and balances.",
                            fontSize = 13.sp,
                            color = cs.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(modifier = Modifier.height(18.dp))
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
                            Text("Add Credit Card", fontSize = 13.sp)
                        }
                    }
                }
            }
        }
        return
    }

    val card = activeSummary.card
    val isOverLimit = activeSummary.remainingLimit != null && activeSummary.remainingLimit < 0.0
    val utilPct = activeSummary.utilizationPercent?.coerceAtMost(100.0)

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Horizontal card selector strip
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 2.dp),
            ) {
                items(cardSummaries, key = { it.card.id }) { item ->
                    val isSelected = item.card.id == activeSummary.card.id
                    val accent = item.card.colorToken.swatchColor(extras.isDark)
                    Surface(
                        modifier = Modifier
                            .width(172.dp)
                            .clickable { onSelectCard(item.card.id) },
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) cs.primaryContainer.copy(alpha = 0.45f) else extras.surfaceCard,
                        border = BorderStroke(
                            width = if (isSelected) 1.5.dp else 1.dp,
                            color = if (isSelected) cs.primary else cs.outlineVariant.copy(alpha = 0.55f),
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(accent),
                                )
                                Text(
                                    text = item.card.name,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = cs.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            Text(
                                text = FinanceEngine.formatMoney(item.currentOutstanding, currency),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = MonoFontFamily,
                                color = cs.onSurface,
                            )
                            Text(
                                text = if (item.upcomingBillAmount > 0.0) {
                                    "Bill ${FinanceEngine.formatMoney(item.upcomingBillAmount, currency)}"
                                } else {
                                    "No bill due"
                                },
                                fontSize = 11.sp,
                                color = if (item.upcomingBillAmount > 0.0) cs.tertiary else cs.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }

        // Selected Card Header & Quick Actions
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(card.colorToken.softBgColor(extras.isDark)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = card.name.take(2).uppercase(),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = card.colorToken.accentColor(extras.isDark),
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = buildString {
                                append(card.name)
                                if (card.lastFour.isNotEmpty()) append(" ••${card.lastFour}")
                            },
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onSurface,
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Bills ${FinanceEngine.formatOrdinalDay(card.billingDay)} · Due ${FinanceEngine.formatOrdinalDay(card.dueDay)}",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                    }
                    Row {
                        IconButton(
                            onClick = { onEditCard(card) },
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Edit,
                                contentDescription = "Edit card",
                                tint = cs.onSurfaceVariant,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                        IconButton(
                            onClick = { onDeleteCard(card) },
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Delete,
                                contentDescription = "Delete card",
                                tint = cs.error,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Quick actions row
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = {
                            onOpenTransactionModal(
                                TransactionModalPreset(type = TransactionType.SPEND, cardId = card.id),
                            )
                        },
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = cs.primaryContainer,
                            contentColor = cs.onPrimaryContainer,
                        ),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        modifier = Modifier.height(36.dp),
                    ) {
                        Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Add Spend", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }

                    FilledTonalButton(
                        onClick = {
                            val unpaidStmt = activeSummary.generatedStatements
                                .filter { it.remainingAmount > 0.0 }
                                .minByOrNull { it.dueDate }
                            onOpenTransactionModal(
                                TransactionModalPreset(
                                    type = TransactionType.PAYMENT,
                                    cardId = card.id,
                                    amount = unpaidStmt?.remainingAmount ?: activeSummary.currentOutstanding.takeIf { it > 0.0 },
                                    description = "${card.name} Bill Payment",
                                    statementCycleKey = unpaidStmt?.cycleKey,
                                ),
                            )
                        },
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        modifier = Modifier.height(36.dp),
                    ) {
                        Icon(Icons.Rounded.Payments, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Pay Bill", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }

                    FilledTonalButton(
                        onClick = {
                            onOpenTransactionModal(
                                TransactionModalPreset(
                                    type = TransactionType.CASHBACK,
                                    cardId = card.id,
                                    description = "${card.name} Cashback",
                                ),
                            )
                        },
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = extras.successContainer,
                            contentColor = extras.onSuccessContainer,
                        ),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        modifier = Modifier.height(36.dp),
                    ) {
                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Cashback", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(14.dp))

                // 4-metric billing cycle grid (2x2)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    MetricTile(
                        label = "Outstanding",
                        value = FinanceEngine.formatMoney(activeSummary.currentOutstanding, currency),
                        sub = if (activeSummary.creditSurplus > 0.0) {
                            "Credit +${FinanceEngine.formatMoney(activeSummary.creditSurplus, currency)}"
                        } else {
                            "Total due"
                        },
                        modifier = Modifier.weight(1f),
                    )
                    MetricTile(
                        label = "Generated Bill",
                        value = FinanceEngine.formatMoney(activeSummary.upcomingBillAmount, currency),
                        sub = activeSummary.nextDueDate?.let { "Due ${FinanceEngine.formatDayMonth(it)}" } ?: "Settled",
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    MetricTile(
                        label = "Current Unbilled",
                        value = FinanceEngine.formatMoney(activeSummary.currentUnbilledAmount, currency),
                        sub = "Bills ${FinanceEngine.formatDayMonth(activeSummary.nextStatementDate)}",
                        modifier = Modifier.weight(1f),
                    )
                    MetricTile(
                        label = "Cashback Earned",
                        value = FinanceEngine.formatMoney(activeSummary.totalCashback, currency),
                        sub = "All-time rewards",
                        valueColor = if (activeSummary.totalCashback > 0.0) extras.success else cs.onSurface,
                        modifier = Modifier.weight(1f),
                    )
                }

                if (card.limit != null && card.limit > 0.0 && utilPct != null) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = "Limit ${FinanceEngine.formatMoney(card.limit, currency)}",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                        Text(
                            text = if (isOverLimit) {
                                "Over limit by ${FinanceEngine.formatMoney(abs(activeSummary.remainingLimit ?: 0.0), currency)}"
                            } else {
                                "Avail ${FinanceEngine.formatMoney(activeSummary.remainingLimit ?: 0.0, currency)} (${activeSummary.utilizationPercent}%)"
                            },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (isOverLimit) cs.error else cs.onSurfaceVariant,
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(7.dp)
                            .clip(RoundedCornerShape(50))
                            .background(extras.surfaceHigh),
                    ) {
                        val barColor = when {
                            isOverLimit || utilPct >= 80.0 -> cs.error
                            utilPct >= 50.0 -> cs.tertiary
                            else -> card.colorToken.swatchColor(extras.isDark)
                        }
                        val fraction = if (activeSummary.currentOutstanding > 0.0) {
                            (utilPct / 100.0).toFloat().coerceIn(0.02f, 1f)
                        } else {
                            0f
                        }
                        if (fraction > 0f) {
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

        // Statement History
        item {
            LedgerCard(contentPadding = PaddingValues(0.dp)) {
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
                    Text(
                        text = "Statement History",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    Text(
                        text = "Current cycle: ${FinanceEngine.formatDayMonth(activeSummary.currentCycle.cycleStart)} – ${FinanceEngine.formatDayMonth(activeSummary.currentCycle.statementDate)}",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                if (activeSummary.generatedStatements.isEmpty()) {
                    Text(
                        text = "No generated statements yet.",
                        fontSize = 13.sp,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(18.dp),
                    )
                } else {
                    activeSummary.generatedStatements.forEachIndexed { idx, stmt ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 18.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${FinanceEngine.formatDayMonth(stmt.cycleStart)} – ${FinanceEngine.formatDayMonth(stmt.statementDate)}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = cs.onSurface,
                                    )
                                    Text(
                                        text = "Due ${FinanceEngine.formatShortDate(stmt.dueDate)} · ${stmt.transactionCount} ${if (stmt.transactionCount == 1) "entry" else "entries"}",
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = FinanceEngine.formatMoney(stmt.billedAmount, currency),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        fontFamily = MonoFontFamily,
                                        color = cs.onSurface,
                                    )
                                    StatusInlineBadge(stmt.status)
                                }
                            }
                            if (stmt.remainingAmount > 0.0) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = "Remaining ${FinanceEngine.formatMoney(stmt.remainingAmount, currency)}" +
                                            if (stmt.paidAmount > 0.0) " · Paid ${FinanceEngine.formatMoney(stmt.paidAmount, currency)}" else "",
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                    )
                                    Button(
                                        onClick = {
                                            onOpenTransactionModal(
                                                TransactionModalPreset(
                                                    type = TransactionType.PAYMENT,
                                                    cardId = card.id,
                                                    amount = stmt.remainingAmount,
                                                    description = "${card.name} Statement Payment",
                                                    statementCycleKey = stmt.cycleKey,
                                                ),
                                            )
                                        },
                                        shape = RoundedCornerShape(50),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = cs.primaryContainer,
                                            contentColor = cs.onPrimaryContainer,
                                        ),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                        modifier = Modifier.height(32.dp),
                                    ) {
                                        Text("Pay Bill", fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                        if (idx < activeSummary.generatedStatements.lastIndex) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                        }
                    }
                }
            }
        }

        // Card Activity
        item {
            LedgerCard(contentPadding = PaddingValues(0.dp)) {
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
                    Text(
                        text = "Card Activity",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    Text(
                        text = "Spent ${FinanceEngine.formatMoney(activeSummary.totalSpend, currency)} · Paid ${FinanceEngine.formatMoney(activeSummary.totalPayments, currency)}",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                if (activeCardTransactions.isEmpty()) {
                    Text(
                        text = "No transactions recorded on ${card.name} yet.",
                        fontSize = 13.sp,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(18.dp),
                    )
                } else {
                    activeCardTransactions.forEachIndexed { idx, tx ->
                        TransactionRowItem(
                            tx = tx,
                            cardById = cardById,
                            bankAccounts = settings.bankAccounts,
                            currency = currency,
                            todayDate = todayDate,
                            showCycleLabel = true,
                            onEdit = onEditTransaction,
                            onDelete = onDeleteTransaction,
                        )
                        if (idx < activeCardTransactions.lastIndex) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.4f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricTile(
    label: String,
    value: String,
    sub: String,
    modifier: Modifier = Modifier,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(extras.surfaceHigh.copy(alpha = 0.65f))
            .padding(12.dp),
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = cs.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            fontFamily = MonoFontFamily,
            color = valueColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = sub,
            fontSize = 11.sp,
            color = cs.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
