package com.rahul2327.cardledger.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.CashbackDestination
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.PaymentStatus
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily

@Composable
fun LedgerCard(
    modifier: Modifier = Modifier,
    containerColor: Color = LocalCardLedgerColors.current.surfaceCard,
    borderColor: Color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f),
    contentPadding: PaddingValues = PaddingValues(18.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = containerColor,
        border = BorderStroke(1.dp, borderColor),
    ) {
        Column(modifier = Modifier.padding(contentPadding), content = content)
    }
}

@Composable
fun StatusInlineBadge(status: PaymentStatus) {
    val extras = LocalCardLedgerColors.current
    val (icon, color, text) = when (status) {
        PaymentStatus.PAID -> Triple(Icons.Rounded.CheckCircle, extras.success, "Paid")
        PaymentStatus.PARTIALLY_PAID -> Triple(Icons.Rounded.Schedule, MaterialTheme.colorScheme.tertiary, "Partially Paid")
        PaymentStatus.OVERDUE -> Triple(Icons.Rounded.ErrorOutline, MaterialTheme.colorScheme.error, "Overdue")
        PaymentStatus.UNPAID -> Triple(Icons.Rounded.Schedule, MaterialTheme.colorScheme.tertiary, "Unpaid")
        PaymentStatus.NO_BILL -> Triple(null, MaterialTheme.colorScheme.onSurfaceVariant, "No Bill")
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(14.dp),
            )
        }
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = color,
            maxLines = 1,
        )
    }
}

@Composable
fun TransactionRowItem(
    tx: Transaction,
    cardById: Map<String, CreditCard>,
    bankAccounts: List<BankAccount>,
    currency: CurrencyCode,
    todayDate: String,
    showCycleLabel: Boolean = false,
    onEdit: (Transaction) -> Unit,
    onDelete: (Transaction) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme

    val card = cardById[tx.cardId]
    val bankAcc = tx.bankAccountId?.let { id -> bankAccounts.firstOrNull { it.id == id } }
        ?: bankAccounts.firstOrNull()

    val isPayment = tx.type == TransactionType.PAYMENT
    val isBankSpend = tx.type == TransactionType.BANK_SPEND
    val isCashback = tx.type == TransactionType.CASHBACK

    val iconBg = when {
        isPayment || isCashback -> extras.successContainer
        isBankSpend -> cs.secondaryContainer
        else -> extras.surfaceHigh
    }
    val iconTint = when {
        isPayment || isCashback -> extras.onSuccessContainer
        isBankSpend -> cs.onSecondaryContainer
        else -> cs.onSurfaceVariant
    }
    val icon = when {
        isPayment -> Icons.Rounded.ArrowDownward
        isCashback -> Icons.Rounded.AutoAwesome
        isBankSpend -> Icons.Rounded.AccountBalance
        else -> Icons.Rounded.ArrowUpward
    }

    val amountColor = if (isPayment || isCashback) extras.success else cs.onSurface
    val amountPrefix = if (isPayment || isBankSpend) "−" else "+"

    val cycleSuffix = if (showCycleLabel && tx.type == TransactionType.SPEND && card != null) {
        val win = FinanceEngine.getCycleWindowForTransactionDate(tx.date, card.billingDay, card.dueDay)
        if (win.statementDate <= todayDate) " · Billed" else " · Current Cycle"
    } else {
        ""
    }

    val subtitle = when (tx.type) {
        TransactionType.BANK_SPEND -> {
            val cat = FinanceEngine.resolveTransactionCategory(tx).label
            val mode = if (tx.deductFromBank == false) "Not deducted" else "Bank / UPI"
            "${bankAcc?.name ?: "Bank"} · ${FinanceEngine.formatShortDate(tx.date)} · $cat · $mode"
        }
        TransactionType.CASHBACK -> {
            val dest = if (tx.cashbackDestination == CashbackDestination.BANK) {
                "Cashback → ${bankAcc?.name ?: "Bank"}"
            } else {
                "Cashback · Card bill"
            }
            "${card?.name ?: "Card"} · ${FinanceEngine.formatShortDate(tx.date)} · $dest"
        }
        TransactionType.PAYMENT -> {
            val paidNote = if (tx.deductFromBank == true && bankAcc != null) {
                "Paid via ${bankAcc.name}"
            } else {
                "Payment"
            }
            "${card?.name ?: "Card"} · ${FinanceEngine.formatShortDate(tx.date)} · $paidNote"
        }
        TransactionType.SPEND -> {
            val cat = FinanceEngine.resolveTransactionCategory(tx).label
            "${card?.name ?: "Card"} · ${FinanceEngine.formatShortDate(tx.date)} · $cat$cycleSuffix"
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit(tx) }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(iconBg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(18.dp),
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = tx.description,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = cs.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = cs.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "$amountPrefix${FinanceEngine.formatMoney(tx.amount, currency)}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = MonoFontFamily,
                color = amountColor,
                maxLines = 1,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { onEdit(tx) },
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Edit,
                        contentDescription = "Edit ${tx.description}",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                }
                IconButton(
                    onClick = { onDelete(tx) },
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Delete,
                        contentDescription = "Delete ${tx.description}",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}
