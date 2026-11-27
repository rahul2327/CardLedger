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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SwapVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.components.LedgerCard
import com.rahul2327.cardledger.ui.components.TransactionRowItem
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily

private enum class HistoryTypeFilter(val label: String) {
    ALL("All"),
    CARD_SPEND("Card"),
    BANK_SPEND("Bank / UPI"),
    PAYMENT("Paid"),
    CASHBACK("Cashback"),
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HistoryScreen(
    settings: AppSettings,
    cards: List<CreditCard>,
    transactions: List<Transaction>,
    todayDate: String,
    onEditTransaction: (Transaction) -> Unit,
    onDeleteTransaction: (Transaction) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency

    var query by remember { mutableStateOf("") }
    var typeFilter by remember { mutableStateOf(HistoryTypeFilter.ALL) }
    var sourceFilterKey by remember { mutableStateOf("all") } // "all", "card:<id>", "bank:<id>"
    var newestFirst by remember { mutableStateOf(true) }
    var sourceMenuExpanded by remember { mutableStateOf(false) }

    val cardById = remember(cards) { cards.associateBy { it.id } }

    val sourceFilterLabel = remember(sourceFilterKey, cards, settings.bankAccounts) {
        when {
            sourceFilterKey == "all" -> "All Sources"
            sourceFilterKey.startsWith("card:") -> {
                val id = sourceFilterKey.removePrefix("card:")
                cards.firstOrNull { it.id == id }?.name ?: "All Sources"
            }
            sourceFilterKey.startsWith("bank:") -> {
                val id = sourceFilterKey.removePrefix("bank:")
                settings.bankAccounts.firstOrNull { it.id == id }?.name ?: "All Sources"
            }
            else -> "All Sources"
        }
    }

    val filtered = remember(transactions, query, typeFilter, sourceFilterKey, newestFirst, cardById, settings.bankAccounts) {
        val q = query.trim().lowercase()
        val list = transactions.filter { tx ->
            val typeOk = when (typeFilter) {
                HistoryTypeFilter.ALL -> true
                HistoryTypeFilter.CARD_SPEND -> tx.type == TransactionType.SPEND
                HistoryTypeFilter.BANK_SPEND -> tx.type == TransactionType.BANK_SPEND
                HistoryTypeFilter.PAYMENT -> tx.type == TransactionType.PAYMENT
                HistoryTypeFilter.CASHBACK -> tx.type == TransactionType.CASHBACK
            }
            if (!typeOk) return@filter false

            val sourceOk = when {
                sourceFilterKey == "all" -> true
                sourceFilterKey.startsWith("card:") -> tx.cardId == sourceFilterKey.removePrefix("card:")
                sourceFilterKey.startsWith("bank:") -> tx.bankAccountId == sourceFilterKey.removePrefix("bank:")
                else -> true
            }
            if (!sourceOk) return@filter false

            if (q.isEmpty()) return@filter true
            val cardName = cardById[tx.cardId]?.name?.lowercase() ?: ""
            val bankName = settings.bankAccounts.firstOrNull { it.id == tx.bankAccountId }?.name?.lowercase() ?: ""
            val catName = FinanceEngine.resolveTransactionCategory(tx).label.lowercase()
            tx.description.lowercase().contains(q) ||
                cardName.contains(q) ||
                bankName.contains(q) ||
                catName.contains(q) ||
                tx.date.contains(q)
        }
        if (newestFirst) list else list.reversed()
    }

    val filteredSpent = remember(filtered) {
        FinanceEngine.roundMoney(
            filtered.filter { it.type == TransactionType.SPEND || it.type == TransactionType.BANK_SPEND }
                .sumOf { it.amount },
        )
    }
    val filteredPaid = remember(filtered) {
        FinanceEngine.roundMoney(
            filtered.filter { it.type == TransactionType.PAYMENT }.sumOf { it.amount },
        )
    }
    val filteredCashback = remember(filtered) {
        FinanceEngine.roundMoney(
            filtered.filter { it.type == TransactionType.CASHBACK }.sumOf { it.amount },
        )
    }

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Search & Filter Panel
        item {
            LedgerCard(contentPadding = PaddingValues(14.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Search description, card, bank, category", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(Icons.Rounded.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                    },
                    trailingIcon = {
                        if (query.isNotEmpty()) {
                            IconButton(onClick = { query = "" }) {
                                Icon(Icons.Rounded.Close, contentDescription = "Clear search", modifier = Modifier.size(18.dp))
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(50),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedContainerColor = extras.surfaceLow,
                        focusedContainerColor = extras.surfaceLow,
                        unfocusedBorderColor = cs.outlineVariant,
                        focusedBorderColor = cs.primary,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(modifier = Modifier.height(10.dp))

                // 5 wrapping type filter pills
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    HistoryTypeFilter.entries.forEach { filter ->
                        val active = typeFilter == filter
                        Surface(
                            modifier = Modifier.clickable { typeFilter = filter },
                            shape = RoundedCornerShape(50),
                            color = if (active) cs.primaryContainer else extras.surfaceHigh,
                            border = BorderStroke(
                                1.dp,
                                if (active) cs.primary.copy(alpha = 0.4f) else cs.outlineVariant.copy(alpha = 0.5f),
                            ),
                        ) {
                            Text(
                                text = filter.label,
                                fontSize = 12.sp,
                                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (active) cs.onPrimaryContainer else cs.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Source dropdown + Sort toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { sourceMenuExpanded = true },
                            shape = RoundedCornerShape(50),
                            color = extras.surfaceLow,
                            border = BorderStroke(1.dp, cs.outlineVariant.copy(alpha = 0.7f)),
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = sourceFilterLabel,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Icon(
                                    imageVector = Icons.Rounded.ArrowDropDown,
                                    contentDescription = null,
                                    tint = cs.onSurfaceVariant,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = sourceMenuExpanded,
                            onDismissRequest = { sourceMenuExpanded = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("All Sources") },
                                onClick = {
                                    sourceFilterKey = "all"
                                    sourceMenuExpanded = false
                                },
                            )
                            if (cards.isNotEmpty()) {
                                HorizontalDivider()
                                cards.forEach { card ->
                                    DropdownMenuItem(
                                        text = { Text("Card · ${card.name}") },
                                        onClick = {
                                            sourceFilterKey = "card:${card.id}"
                                            sourceMenuExpanded = false
                                        },
                                    )
                                }
                            }
                            if (settings.bankAccounts.isNotEmpty()) {
                                HorizontalDivider()
                                settings.bankAccounts.forEach { acc ->
                                    DropdownMenuItem(
                                        text = { Text("Bank · ${acc.name}") },
                                        onClick = {
                                            sourceFilterKey = "bank:${acc.id}"
                                            sourceMenuExpanded = false
                                        },
                                    )
                                }
                            }
                        }
                    }

                    Surface(
                        modifier = Modifier.clickable { newestFirst = !newestFirst },
                        shape = RoundedCornerShape(50),
                        color = extras.surfaceLow,
                        border = BorderStroke(1.dp, cs.outlineVariant.copy(alpha = 0.7f)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.SwapVert,
                                contentDescription = null,
                                tint = cs.onSurfaceVariant,
                                modifier = Modifier.size(15.dp),
                            )
                            Text(
                                text = if (newestFirst) "Newest" else "Oldest",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = cs.onSurface,
                            )
                        }
                    }
                }
            }
        }

        // Filtered Totals Strip
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(extras.surfaceCard)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${filtered.size} ${if (filtered.size == 1) "entry" else "entries"}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = cs.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Spent ${FinanceEngine.formatMoney(filteredSpent, currency, compact = true)}",
                        fontSize = 12.sp,
                        fontFamily = MonoFontFamily,
                        fontWeight = FontWeight.Medium,
                        color = cs.onSurface,
                    )
                    if (filteredPaid > 0.0) {
                        Text(
                            text = "Paid ${FinanceEngine.formatMoney(filteredPaid, currency, compact = true)}",
                            fontSize = 12.sp,
                            fontFamily = MonoFontFamily,
                            fontWeight = FontWeight.Medium,
                            color = extras.success,
                        )
                    }
                    if (filteredCashback > 0.0) {
                        Text(
                            text = "CB +${FinanceEngine.formatMoney(filteredCashback, currency, compact = true)}",
                            fontSize = 12.sp,
                            fontFamily = MonoFontFamily,
                            fontWeight = FontWeight.Medium,
                            color = extras.success,
                        )
                    }
                }
            }
        }

        // Transactions List
        if (filtered.isEmpty()) {
            item {
                LedgerCard(contentPadding = PaddingValues(24.dp)) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = if (transactions.isEmpty()) "No transactions recorded yet." else "No matching transactions.",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = cs.onSurface,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (transactions.isEmpty()) "Tap Add entry below to record a spend, payment, or cashback."
                            else "Try clearing your search or switching filters.",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                    }
                }
            }
        } else {
            item {
                LedgerCard(contentPadding = PaddingValues(0.dp)) {
                    filtered.forEachIndexed { idx, tx ->
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
                        if (idx < filtered.lastIndex) {
                            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.4f))
                        }
                    }
                }
            }
        }
    }
}
