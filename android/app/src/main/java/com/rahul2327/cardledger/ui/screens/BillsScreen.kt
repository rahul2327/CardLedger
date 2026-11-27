package com.rahul2327.cardledger.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.DashboardSummary
import com.rahul2327.cardledger.model.TransactionModalPreset
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.components.LedgerCard
import com.rahul2327.cardledger.ui.components.StatusInlineBadge
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily
import com.rahul2327.cardledger.ui.theme.swatchColor

@Composable
fun BillsScreen(
    settings: AppSettings,
    summary: DashboardSummary,
    onAddCard: () -> Unit,
    onOpenTransactionModal: (TransactionModalPreset) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency

    if (summary.cardSummaries.isEmpty()) {
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
                                imageVector = Icons.Rounded.ReceiptLong,
                                contentDescription = null,
                                tint = cs.onPrimaryContainer,
                            )
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "No billing cycles tracked yet",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onSurface,
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Add a credit card to see generated statements, due countdowns, and unbilled cycle totals.",
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

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Summary Strip
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                LedgerCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(14.dp)) {
                    Text("Total Due Bills", fontSize = 12.sp, color = cs.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = FinanceEngine.formatMoney(summary.upcomingCCBills, currency),
                        fontSize = 19.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = MonoFontFamily,
                        color = cs.onSurface,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "${summary.upcomingDueBills.size} unpaid ${if (summary.upcomingDueBills.size == 1) "bill" else "bills"}",
                        fontSize = 11.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                LedgerCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(14.dp)) {
                    Text("Current Unbilled", fontSize = 12.sp, color = cs.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = FinanceEngine.formatMoney(summary.currentUnbilledTotal, currency),
                        fontSize = 19.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = MonoFontFamily,
                        color = cs.onSurface,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Open billing cycles",
                        fontSize = 11.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
            }
        }

        // Upcoming Due Bills Card
        item {
            LedgerCard(contentPadding = PaddingValues(0.dp)) {
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
                    Text(
                        text = "Due & Upcoming Bills",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                    Text(
                        text = "Ordered by earliest due date",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                    )
                }
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                if (summary.upcomingDueBills.isEmpty()) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically,
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
                                text = "All generated statements are paid",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "No unpaid credit card bills right now.",
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
                                        text = "Cycle ${FinanceEngine.formatDayMonth(item.statement.cycleStart)} – ${FinanceEngine.formatDayMonth(item.statement.statementDate)}",
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                    )
                                    Text(
                                        text = "Due ${FinanceEngine.formatShortDate(item.statement.dueDate)}",
                                        fontSize = 12.sp,
                                        color = cs.onSurfaceVariant,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = FinanceEngine.formatMoney(item.statement.remainingAmount, currency),
                                        fontSize = 16.sp,
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
                                StatusInlineBadge(item.statement.status)
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

        // Per-card cycle & statement breakdown
        items(summary.cardSummaries, key = { it.card.id }) { cardSummary ->
            LedgerCard(contentPadding = PaddingValues(0.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(11.dp)
                                .clip(CircleShape)
                                .background(cardSummary.card.colorToken.swatchColor(extras.isDark)),
                        )
                        Column {
                            Text(
                                text = cardSummary.card.name,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = "Bills ${FinanceEngine.formatOrdinalDay(cardSummary.card.billingDay)} · Due ${FinanceEngine.formatOrdinalDay(cardSummary.card.dueDay)}",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = FinanceEngine.formatMoney(cardSummary.currentUnbilledAmount, currency),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = MonoFontFamily,
                            color = cs.onSurface,
                        )
                        Text(
                            text = "Unbilled · Next ${FinanceEngine.formatDayMonth(cardSummary.nextStatementDate)}",
                            fontSize = 11.sp,
                            color = cs.onSurfaceVariant,
                        )
                    }
                }

                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.5f))

                if (cardSummary.generatedStatements.isEmpty()) {
                    Text(
                        text = "No generated statements yet.",
                        fontSize = 12.sp,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                } else {
                    cardSummary.generatedStatements.take(3).forEachIndexed { idx, stmt ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 18.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Statement ${FinanceEngine.formatShortDate(stmt.statementDate)}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                )
                                Text(
                                    text = "Due ${FinanceEngine.formatShortDate(stmt.dueDate)}",
                                    fontSize = 11.sp,
                                    color = cs.onSurfaceVariant,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = FinanceEngine.formatMoney(stmt.billedAmount, currency),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    fontFamily = MonoFontFamily,
                                    color = cs.onSurface,
                                )
                                StatusInlineBadge(stmt.status)
                            }
                        }
                        if (idx < minOf(2, cardSummary.generatedStatements.lastIndex)) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.4f))
                        }
                    }
                }
            }
        }
    }
}
