package com.rahul2327.cardledger.ui.modals

import android.app.DatePickerDialog
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.BankAccount
import com.rahul2327.cardledger.model.BankAccountInput
import com.rahul2327.cardledger.model.CardColorToken
import com.rahul2327.cardledger.model.CardInput
import com.rahul2327.cardledger.model.CardSummary
import com.rahul2327.cardledger.model.CashbackDestination
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.SpendingCategory
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionInput
import com.rahul2327.cardledger.model.TransactionModalPreset
import com.rahul2327.cardledger.model.TransactionType
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily
import com.rahul2327.cardledger.ui.theme.chartColor
import com.rahul2327.cardledger.ui.theme.swatchColor

private fun formatInputNumber(value: Double): String {
    val rounded = FinanceEngine.roundMoney(value)
    return if (rounded % 1.0 == 0.0) rounded.toLong().toString() else rounded.toString()
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TransactionFormSheet(
    editingTx: Transaction?,
    preset: TransactionModalPreset?,
    settings: AppSettings,
    cards: List<CreditCard>,
    cardSummaries: List<CardSummary>,
    todayDate: String,
    onDismiss: () -> Unit,
    onSave: (TransactionInput) -> Unit,
) {
    val context = LocalContext.current
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val initialType = editingTx?.type
        ?: preset?.type
        ?: if (cards.isEmpty() && settings.bankAccounts.isNotEmpty()) {
            TransactionType.BANK_SPEND
        } else {
            TransactionType.SPEND
        }

    var txType by remember { mutableStateOf(initialType) }
    var selectedCardId by remember {
        mutableStateOf(
            editingTx?.cardId?.takeIf { id -> cards.any { it.id == id } }
                ?: preset?.cardId?.takeIf { id -> cards.any { it.id == id } }
                ?: cards.firstOrNull()?.id
                ?: "",
        )
    }
    var selectedBankId by remember {
        mutableStateOf(
            editingTx?.bankAccountId?.takeIf { id -> settings.bankAccounts.any { it.id == id } }
                ?: preset?.bankAccountId?.takeIf { id -> settings.bankAccounts.any { it.id == id } }
                ?: settings.bankAccounts.firstOrNull()?.id
                ?: "",
        )
    }
    var amountText by remember {
        mutableStateOf(
            editingTx?.amount?.let { formatInputNumber(it) }
                ?: preset?.amount?.takeIf { it > 0.0 }?.let { formatInputNumber(it) }
                ?: "",
        )
    }
    var description by remember {
        mutableStateOf(editingTx?.description ?: preset?.description ?: "")
    }
    var dateStr by remember { mutableStateOf(editingTx?.date ?: todayDate) }
    var category by remember {
        mutableStateOf<SpendingCategory?>(editingTx?.category)
    }
    var categoryManuallyPicked by remember { mutableStateOf(editingTx?.category != null) }
    var deductFromBank by remember {
        mutableStateOf(
            when {
                editingTx != null -> editingTx.deductFromBank ?: (editingTx.type == TransactionType.BANK_SPEND)
                initialType == TransactionType.BANK_SPEND -> true
                initialType == TransactionType.PAYMENT -> settings.bankAccounts.isNotEmpty()
                else -> true
            },
        )
    }
    var cashbackDest by remember {
        mutableStateOf(
            editingTx?.cashbackDestination
                ?: preset?.cashbackDestination
                ?: CashbackDestination.STATEMENT,
        )
    }
    var selectedCycleKey by remember {
        mutableStateOf(editingTx?.statementCycleKey ?: preset?.statementCycleKey ?: "")
    }
    var errorText by remember { mutableStateOf<String?>(null) }

    var cardMenuOpen by remember { mutableStateOf(false) }
    var bankMenuOpen by remember { mutableStateOf(false) }
    var cycleMenuOpen by remember { mutableStateOf(false) }

    val selectedCard = cards.firstOrNull { it.id == selectedCardId }
    val selectedCardSummary = cardSummaries.firstOrNull { it.card.id == selectedCardId }
    val selectedBank = settings.bankAccounts.firstOrNull { it.id == selectedBankId }
        ?: settings.bankAccounts.firstOrNull()

    val effectiveCategory = category ?: FinanceEngine.inferSpendingCategory(description)

    val parsedAmount = amountText.trim().replace(",", "").toDoubleOrNull()
    val validAmount = parsedAmount != null && parsedAmount > 0.0 && parsedAmount <= FinanceEngine.MAX_AMOUNT

    // Projected bank balance preview
    val projectedBankPreview: Pair<String, Double>? = remember(
        txType, deductFromBank, cashbackDest, selectedBank, parsedAmount, editingTx,
    ) {
        if (selectedBank == null || parsedAmount == null || parsedAmount <= 0.0) return@remember null
        val bankEffectDelta = when (txType) {
            TransactionType.PAYMENT -> if (deductFromBank) -parsedAmount else null
            TransactionType.BANK_SPEND -> if (deductFromBank) -parsedAmount else null
            TransactionType.CASHBACK -> if (cashbackDest == CashbackDestination.BANK) parsedAmount else null
            TransactionType.SPEND -> null
        } ?: return@remember null

        val prevDelta = editingTx?.let {
            val eff = FinanceEngine.getTransactionBankEffect(it, settings.bankAccounts)
            if (eff?.account?.id == selectedBank.id) eff.delta else 0.0
        } ?: 0.0

        val projected = FinanceEngine.roundMoney(selectedBank.balance - prevDelta + bankEffectDelta)
        selectedBank.name to projected
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = extras.surfaceCard,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = if (editingTx != null) "Edit Entry" else "New Entry",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = cs.onSurface,
            )

            // 2x2 Transaction Type Switcher
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    TypeChipButton(
                        label = "Card Spend",
                        icon = Icons.Rounded.CreditCard,
                        selected = txType == TransactionType.SPEND,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            txType = TransactionType.SPEND
                            errorText = null
                        },
                    )
                    TypeChipButton(
                        label = "Bank / UPI",
                        icon = Icons.Rounded.AccountBalance,
                        selected = txType == TransactionType.BANK_SPEND,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            txType = TransactionType.BANK_SPEND
                            deductFromBank = true
                            errorText = null
                        },
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    TypeChipButton(
                        label = "Pay Bill",
                        icon = Icons.Rounded.Payments,
                        selected = txType == TransactionType.PAYMENT,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            txType = TransactionType.PAYMENT
                            if (editingTx == null) deductFromBank = settings.bankAccounts.isNotEmpty()
                            errorText = null
                        },
                    )
                    TypeChipButton(
                        label = "Cashback",
                        icon = Icons.Rounded.AutoAwesome,
                        selected = txType == TransactionType.CASHBACK,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            txType = TransactionType.CASHBACK
                            errorText = null
                        },
                    )
                }
            }

            // Card Picker (for Card Spend, Pay Bill, Cashback)
            if (txType != TransactionType.BANK_SPEND) {
                if (cards.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = cs.errorContainer,
                    ) {
                        Text(
                            text = "Add a credit card first before logging card entries, or switch to Bank / UPI.",
                            fontSize = 12.sp,
                            color = cs.onErrorContainer,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                } else {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        SelectorField(
                            label = "Credit Card",
                            value = selectedCard?.let { c ->
                                if (c.lastFour.isNotEmpty()) "${c.name} ••${c.lastFour}" else c.name
                            } ?: "Select card",
                            onClick = { cardMenuOpen = true },
                        )
                        DropdownMenu(
                            expanded = cardMenuOpen,
                            onDismissRequest = { cardMenuOpen = false },
                        ) {
                            cards.forEach { card ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            if (card.lastFour.isNotEmpty()) "${card.name} ••${card.lastFour}" else card.name,
                                        )
                                    },
                                    onClick = {
                                        selectedCardId = card.id
                                        selectedCycleKey = ""
                                        cardMenuOpen = false
                                    },
                                )
                            }
                        }
                    }
                }
            }

            // Cashback Destination Switcher
            if (txType == TransactionType.CASHBACK) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Cashback Credit Destination",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = cs.onSurfaceVariant,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DestinationPill(
                            label = "Reduce Card Bill",
                            selected = cashbackDest == CashbackDestination.STATEMENT,
                            modifier = Modifier.weight(1f),
                            onClick = { cashbackDest = CashbackDestination.STATEMENT },
                        )
                        DestinationPill(
                            label = "Credit to Bank",
                            selected = cashbackDest == CashbackDestination.BANK,
                            modifier = Modifier.weight(1f),
                            onClick = { cashbackDest = CashbackDestination.BANK },
                        )
                    }
                }
            }

            // Amount + Quick Fill buttons
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(
                    value = amountText,
                    onValueChange = {
                        amountText = it
                        errorText = null
                    },
                    label = { Text("Amount (${currency.symbol})") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth(),
                )

                if (txType == TransactionType.PAYMENT && selectedCardSummary != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (selectedCardSummary.upcomingBillAmount > 0.0) {
                            FilledTonalButton(
                                onClick = { amountText = formatInputNumber(selectedCardSummary.upcomingBillAmount) },
                                shape = RoundedCornerShape(50),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                modifier = Modifier.height(30.dp),
                            ) {
                                Text(
                                    text = "Bill Due ${FinanceEngine.formatMoney(selectedCardSummary.upcomingBillAmount, currency)}",
                                    fontSize = 11.sp,
                                )
                            }
                        }
                        if (selectedCardSummary.currentOutstanding > 0.0 &&
                            selectedCardSummary.currentOutstanding != selectedCardSummary.upcomingBillAmount
                        ) {
                            FilledTonalButton(
                                onClick = { amountText = formatInputNumber(selectedCardSummary.currentOutstanding) },
                                shape = RoundedCornerShape(50),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                modifier = Modifier.height(30.dp),
                            ) {
                                Text(
                                    text = "Full ${FinanceEngine.formatMoney(selectedCardSummary.currentOutstanding, currency)}",
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
            }

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { next ->
                    description = next
                    if (!categoryManuallyPicked) {
                        category = null
                    }
                    errorText = null
                },
                label = {
                    Text(
                        when (txType) {
                            TransactionType.SPEND -> "Description (e.g. Swiggy, Fuel, Amazon)"
                            TransactionType.BANK_SPEND -> "Description (e.g. Kirana UPI, Auto, Rent)"
                            TransactionType.PAYMENT -> "Description (e.g. Statement Payment)"
                            TransactionType.CASHBACK -> "Description (e.g. 5% Cashback Credit)"
                        },
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            // Date Picker trigger
            SelectorField(
                label = "Date",
                value = FinanceEngine.formatShortDate(dateStr),
                trailingIcon = Icons.Rounded.CalendarMonth,
                onClick = {
                    val p = FinanceEngine.parseDateParts(dateStr)
                    DatePickerDialog(
                        context,
                        { _, year, monthZero, day ->
                            dateStr = FinanceEngine.formatDateParts(year, monthZero + 1, day)
                        },
                        p.year,
                        p.month - 1,
                        p.day,
                    ).show()
                },
            )

            // Category Chips (for Card Spend & Bank / UPI Spend)
            if (txType == TransactionType.SPEND || txType == TransactionType.BANK_SPEND) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Category",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = cs.onSurfaceVariant,
                        )
                        if (!categoryManuallyPicked) {
                            Text(
                                text = "Auto: ${effectiveCategory.shortLabel}",
                                fontSize = 11.sp,
                                color = cs.primary,
                            )
                        }
                    }
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        SpendingCategory.entries.forEach { cat ->
                            val selected = effectiveCategory == cat
                            val dotColor = cat.chartColor(extras.isDark)
                            Surface(
                                modifier = Modifier.clickable {
                                    category = cat
                                    categoryManuallyPicked = true
                                },
                                shape = RoundedCornerShape(50),
                                color = if (selected) cs.primaryContainer else extras.surfaceHigh,
                                border = BorderStroke(
                                    1.dp,
                                    if (selected) cs.primary.copy(alpha = 0.5f) else cs.outlineVariant.copy(alpha = 0.5f),
                                ),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(dotColor),
                                    )
                                    Text(
                                        text = cat.shortLabel,
                                        fontSize = 12.sp,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                                        color = if (selected) cs.onPrimaryContainer else cs.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Target Statement Picker (for Pay Bill or Statement Cashback)
            val showStatementPicker = selectedCardSummary != null &&
                (txType == TransactionType.PAYMENT ||
                    (txType == TransactionType.CASHBACK && cashbackDest == CashbackDestination.STATEMENT)) &&
                selectedCardSummary.generatedStatements.isNotEmpty()

            if (showStatementPicker && selectedCardSummary != null) {
                val chosenStmt = selectedCardSummary.generatedStatements.firstOrNull { it.cycleKey == selectedCycleKey }
                Box(modifier = Modifier.fillMaxWidth()) {
                    SelectorField(
                        label = "Apply To Statement",
                        value = if (chosenStmt != null) {
                            "Statement ${FinanceEngine.formatDayMonth(chosenStmt.statementDate)} (Due ${FinanceEngine.formatMoney(chosenStmt.remainingAmount, currency)})"
                        } else {
                            "Auto (Oldest Unpaid First)"
                        },
                        onClick = { cycleMenuOpen = true },
                    )
                    DropdownMenu(
                        expanded = cycleMenuOpen,
                        onDismissRequest = { cycleMenuOpen = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("Auto (Oldest Unpaid First)") },
                            onClick = {
                                selectedCycleKey = ""
                                cycleMenuOpen = false
                            },
                        )
                        selectedCardSummary.generatedStatements.forEach { stmt ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "${FinanceEngine.formatDayMonth(stmt.statementDate)} · Rem ${FinanceEngine.formatMoney(stmt.remainingAmount, currency)}",
                                    )
                                },
                                onClick = {
                                    selectedCycleKey = stmt.cycleKey
                                    cycleMenuOpen = false
                                },
                            )
                        }
                    }
                }
            }

            // Bank Account Selector & Deduction toggle
            val showBankSection = txType == TransactionType.BANK_SPEND ||
                txType == TransactionType.PAYMENT ||
                (txType == TransactionType.CASHBACK && cashbackDest == CashbackDestination.BANK)

            if (showBankSection) {
                if (settings.bankAccounts.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = extras.surfaceHigh,
                    ) {
                        Text(
                            text = "No bank accounts configured yet. Add one from Bank Balance on the Dashboard.",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                } else {
                    if (txType == TransactionType.PAYMENT || txType == TransactionType.BANK_SPEND) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .clickable { deductFromBank = !deductFromBank }
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(
                                checked = deductFromBank,
                                onCheckedChange = { deductFromBank = it },
                            )
                            Text(
                                text = if (txType == TransactionType.BANK_SPEND) {
                                    "Deduct amount from bank balance"
                                } else {
                                    "Deduct bill payment from bank balance"
                                },
                                fontSize = 13.sp,
                                color = cs.onSurface,
                            )
                        }
                    }

                    val needsBankPicker = (txType == TransactionType.CASHBACK && cashbackDest == CashbackDestination.BANK) ||
                        deductFromBank

                    if (needsBankPicker) {
                        Box(modifier = Modifier.fillMaxWidth()) {
                            SelectorField(
                                label = if (txType == TransactionType.CASHBACK) "Credit To Bank Account" else "Bank Account",
                                value = selectedBank?.let {
                                    "${it.name} (${FinanceEngine.formatMoney(it.balance, currency)})"
                                } ?: "Select bank account",
                                onClick = { bankMenuOpen = true },
                            )
                            DropdownMenu(
                                expanded = bankMenuOpen,
                                onDismissRequest = { bankMenuOpen = false },
                            ) {
                                settings.bankAccounts.forEach { acc ->
                                    DropdownMenuItem(
                                        text = {
                                            Text("${acc.name} · ${FinanceEngine.formatMoney(acc.balance, currency)}")
                                        },
                                        onClick = {
                                            selectedBankId = acc.id
                                            bankMenuOpen = false
                                        },
                                    )
                                }
                            }
                        }
                    }

                    if (projectedBankPreview != null) {
                        val (bankName, nextBal) = projectedBankPreview
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = extras.surfaceLow,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    text = "$bankName after save",
                                    fontSize = 12.sp,
                                    color = cs.onSurfaceVariant,
                                )
                                Text(
                                    text = FinanceEngine.formatMoney(nextBal, currency),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    fontFamily = MonoFontFamily,
                                    color = if (nextBal < 0.0) cs.error else extras.success,
                                )
                            }
                        }
                    }
                }
            }

            if (errorText != null) {
                Text(
                    text = errorText!!,
                    fontSize = 12.sp,
                    color = cs.error,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        if (txType != TransactionType.BANK_SPEND && selectedCard == null) {
                            errorText = "Please select a credit card."
                            return@Button
                        }
                        if (txType == TransactionType.BANK_SPEND && settings.bankAccounts.isEmpty()) {
                            errorText = "Please add a bank account first."
                            return@Button
                        }
                        if (!validAmount || parsedAmount == null) {
                            errorText = "Enter a valid amount greater than 0."
                            return@Button
                        }
                        val finalDesc = description.trim().ifEmpty {
                            when (txType) {
                                TransactionType.SPEND -> "${selectedCard?.name ?: "Card"} Spend"
                                TransactionType.BANK_SPEND -> "${selectedBank?.name ?: "Bank"} UPI Spend"
                                TransactionType.PAYMENT -> "${selectedCard?.name ?: "Card"} Bill Payment"
                                TransactionType.CASHBACK -> "${selectedCard?.name ?: "Card"} Cashback"
                            }
                        }
                        onSave(
                            TransactionInput(
                                id = editingTx?.id,
                                cardId = if (txType == TransactionType.BANK_SPEND) "" else selectedCard!!.id,
                                type = txType,
                                amount = parsedAmount,
                                description = finalDesc,
                                category = if (txType == TransactionType.SPEND || txType == TransactionType.BANK_SPEND) {
                                    effectiveCategory
                                } else {
                                    null
                                },
                                date = dateStr,
                                statementCycleKey = selectedCycleKey.takeIf { it.isNotBlank() },
                                deductFromBank = when (txType) {
                                    TransactionType.PAYMENT -> deductFromBank
                                    TransactionType.BANK_SPEND -> deductFromBank
                                    else -> null
                                },
                                bankAccountId = selectedBank?.id,
                                cashbackDestination = if (txType == TransactionType.CASHBACK) cashbackDest else null,
                            ),
                        )
                    },
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = cs.primaryContainer,
                        contentColor = cs.onPrimaryContainer,
                    ),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (editingTx != null) "Save Changes" else "Save Entry")
                }
            }
        }
    }
}

@Composable
private fun TypeChipButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = if (selected) cs.primaryContainer else extras.surfaceHigh,
        border = BorderStroke(
            1.dp,
            if (selected) cs.primary.copy(alpha = 0.5f) else cs.outlineVariant.copy(alpha = 0.5f),
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) cs.onPrimaryContainer else cs.onSurfaceVariant,
                modifier = Modifier.size(16.dp),
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (selected) cs.onPrimaryContainer else cs.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun DestinationPill(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(50),
        color = if (selected) extras.successContainer else extras.surfaceHigh,
        border = BorderStroke(
            1.dp,
            if (selected) extras.success.copy(alpha = 0.5f) else cs.outlineVariant.copy(alpha = 0.5f),
        ),
    ) {
        Box(
            modifier = Modifier.padding(vertical = 9.dp, horizontal = 10.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (selected) extras.onSuccessContainer else cs.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun SelectorField(
    label: String,
    value: String,
    trailingIcon: androidx.compose.ui.graphics.vector.ImageVector = Icons.Rounded.ArrowDropDown,
    onClick: () -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = extras.surfaceLow,
        border = BorderStroke(1.dp, cs.outlineVariant),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, fontSize = 11.sp, color = cs.onSurfaceVariant)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = value,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = cs.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(
                imageVector = trailingIcon,
                contentDescription = null,
                tint = cs.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CardFormSheet(
    editingCard: CreditCard?,
    currency: CurrencyCode,
    todayDate: String,
    onDismiss: () -> Unit,
    onSave: (CardInput) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var name by remember { mutableStateOf(editingCard?.name ?: "") }
    var lastFour by remember { mutableStateOf(editingCard?.lastFour ?: "") }
    var limitText by remember { mutableStateOf(editingCard?.limit?.let { formatInputNumber(it) } ?: "") }
    var billingDayText by remember { mutableStateOf((editingCard?.billingDay ?: 15).toString()) }
    var dueDayText by remember { mutableStateOf((editingCard?.dueDay ?: 5).toString()) }
    var colorToken by remember { mutableStateOf(editingCard?.colorToken ?: CardColorToken.TEAL) }
    var errorText by remember { mutableStateOf<String?>(null) }

    val parsedBillingDay = billingDayText.toIntOrNull()?.coerceIn(1, 31)
    val parsedDueDay = dueDayText.toIntOrNull()?.coerceIn(1, 31)
    val preview = remember(parsedBillingDay, parsedDueDay, todayDate) {
        if (parsedBillingDay != null && parsedDueDay != null) {
            FinanceEngine.previewCardSchedule(parsedBillingDay, parsedDueDay, todayDate)
        } else {
            null
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = extras.surfaceCard,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = if (editingCard != null) "Edit Credit Card" else "Add Credit Card",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = cs.onSurface,
            )

            OutlinedTextField(
                value = name,
                onValueChange = { name = it; errorText = null },
                label = { Text("Card Name (e.g. Axis Ace, HDFC Millennia)") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = lastFour,
                    onValueChange = { lastFour = it.filter { ch -> ch.isDigit() }.take(4) },
                    label = { Text("Last 4 (Optional)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = limitText,
                    onValueChange = { limitText = it },
                    label = { Text("Limit (${currency.symbol})") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.weight(1.2f),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = billingDayText,
                    onValueChange = { billingDayText = it.filter { ch -> ch.isDigit() }.take(2); errorText = null },
                    label = { Text("Billing Day (1–31)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = dueDayText,
                    onValueChange = { dueDayText = it.filter { ch -> ch.isDigit() }.take(2); errorText = null },
                    label = { Text("Due Day (1–31)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.weight(1f),
                )
            }

            if (preview != null) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = extras.surfaceLow,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = "Cycle Preview",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.primary,
                        )
                        Text(
                            text = "Current cycle: ${FinanceEngine.formatDayMonth(preview.currentCycleStart)} – ${FinanceEngine.formatDayMonth(preview.nextStatementDate)} (Due ${FinanceEngine.formatDayMonth(preview.nextStatementDueDate)})",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                        Text(
                            text = "Latest bill: ${FinanceEngine.formatDayMonth(preview.latestStatementDate)} (Due ${FinanceEngine.formatDayMonth(preview.latestStatementDueDate)})",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                    }
                }
            }

            // 6 Card Color Circles
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Card Accent Color", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = cs.onSurfaceVariant)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    CardColorToken.entries.forEach { token ->
                        val selected = token == colorToken
                        val swatch = token.swatchColor(extras.isDark)
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .then(
                                    if (selected) {
                                        Modifier.border(2.5.dp, cs.onSurface, CircleShape)
                                    } else {
                                        Modifier
                                    },
                                )
                                .clickable { colorToken = token },
                            contentAlignment = Alignment.Center,
                        ) {
                            if (selected) {
                                Icon(
                                    imageVector = Icons.Rounded.Check,
                                    contentDescription = token.label,
                                    tint = if (extras.isDark) Color(0xFF131314) else Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                }
            }

            if (errorText != null) {
                Text(errorText!!, fontSize = 12.sp, color = cs.error)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        val trimmedName = name.trim()
                        val bDay = billingDayText.toIntOrNull()
                        val dDay = dueDayText.toIntOrNull()
                        val parsedLimit = limitText.trim().replace(",", "").takeIf { it.isNotEmpty() }?.toDoubleOrNull()

                        if (trimmedName.isEmpty()) {
                            errorText = "Card name is required."
                            return@Button
                        }
                        if (bDay == null || bDay !in 1..31 || dDay == null || dDay !in 1..31) {
                            errorText = "Billing day and due day must be between 1 and 31."
                            return@Button
                        }
                        if (limitText.trim().isNotEmpty() && (parsedLimit == null || parsedLimit <= 0.0)) {
                            errorText = "Credit limit must be a positive number."
                            return@Button
                        }

                        onSave(
                            CardInput(
                                id = editingCard?.id,
                                name = trimmedName,
                                lastFour = lastFour,
                                limit = parsedLimit,
                                billingDay = bDay,
                                dueDay = dDay,
                                colorToken = colorToken,
                            ),
                        )
                    },
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = cs.primaryContainer,
                        contentColor = cs.onPrimaryContainer,
                    ),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (editingCard != null) "Save Card" else "Add Card")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BankAccountsSheet(
    settings: AppSettings,
    totalCCOutstanding: Double,
    onDismiss: () -> Unit,
    onSaveAccount: (BankAccountInput) -> Unit,
    onDeleteAccount: (String) -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var editingId by remember { mutableStateOf<String?>(null) }
    var nameText by remember { mutableStateOf("") }
    var balanceText by remember { mutableStateOf("") }
    var errorText by remember { mutableStateOf<String?>(null) }

    val totalBank = FinanceEngine.getTotalBankBalance(settings)
    val netAfterCC = FinanceEngine.roundMoney(totalBank - totalCCOutstanding)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = extras.surfaceCard,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "Bank Accounts",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = cs.onSurface,
            )

            // Summary banner
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = extras.surfaceLow,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        Text("Total Bank Balance", fontSize = 11.sp, color = cs.onSurfaceVariant)
                        Text(
                            text = FinanceEngine.formatMoney(totalBank, currency),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = MonoFontFamily,
                            color = cs.onSurface,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Net After CC Dues", fontSize = 11.sp, color = cs.onSurfaceVariant)
                        Text(
                            text = FinanceEngine.formatMoney(netAfterCC, currency),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = MonoFontFamily,
                            color = if (netAfterCC < 0.0) cs.error else extras.success,
                        )
                    }
                }
            }

            // Existing accounts list
            if (settings.bankAccounts.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = extras.surfaceLow,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column {
                        settings.bankAccounts.forEachIndexed { idx, acc ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = acc.name,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = cs.onSurface,
                                    )
                                    Text(
                                        text = FinanceEngine.formatMoney(acc.balance, currency),
                                        fontSize = 13.sp,
                                        fontFamily = MonoFontFamily,
                                        color = cs.onSurfaceVariant,
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        editingId = acc.id
                                        nameText = acc.name
                                        balanceText = formatInputNumber(acc.balance)
                                        errorText = null
                                    },
                                ) {
                                    Icon(Icons.Rounded.Edit, contentDescription = "Edit ${acc.name}", modifier = Modifier.size(18.dp))
                                }
                                IconButton(
                                    onClick = {
                                        if (editingId == acc.id) {
                                            editingId = null
                                            nameText = ""
                                            balanceText = ""
                                        }
                                        onDeleteAccount(acc.id)
                                    },
                                ) {
                                    Icon(
                                        Icons.Rounded.Delete,
                                        contentDescription = "Delete ${acc.name}",
                                        tint = cs.error,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }
                            if (idx < settings.bankAccounts.lastIndex) {
                                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.4f))
                            }
                        }
                    }
                }
            }

            // Add / Edit Bank Account Form
            Text(
                text = if (editingId != null) "Edit Account" else "Add Bank Account",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = cs.onSurface,
            )

            OutlinedTextField(
                value = nameText,
                onValueChange = { nameText = it; errorText = null },
                label = { Text("Account Name (e.g. HDFC Savings, SBI Salary)") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = balanceText,
                onValueChange = { balanceText = it; errorText = null },
                label = { Text("Current Balance (${currency.symbol})") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            if (errorText != null) {
                Text(errorText!!, fontSize = 12.sp, color = cs.error)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (editingId != null) {
                    OutlinedButton(
                        onClick = {
                            editingId = null
                            nameText = ""
                            balanceText = ""
                            errorText = null
                        },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Cancel Edit")
                    }
                } else {
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Done")
                    }
                }

                Button(
                    onClick = {
                        val trimmedName = nameText.trim()
                        val parsed = balanceText.trim().replace(",", "").toDoubleOrNull()
                        if (trimmedName.isEmpty()) {
                            errorText = "Enter a bank account name."
                            return@Button
                        }
                        if (parsed == null || !parsed.isFinite()) {
                            errorText = "Enter a valid balance amount."
                            return@Button
                        }
                        onSaveAccount(
                            BankAccountInput(
                                id = editingId,
                                name = trimmedName,
                                balance = parsed,
                            ),
                        )
                        editingId = null
                        nameText = ""
                        balanceText = ""
                        errorText = null
                    },
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = cs.primaryContainer,
                        contentColor = cs.onPrimaryContainer,
                    ),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (editingId != null) "Update Account" else "Add Account")
                }
            }
        }
    }
}

@Composable
fun DeleteTransactionDialog(
    tx: Transaction,
    bankAccounts: List<BankAccount>,
    currency: CurrencyCode,
    onDismiss: () -> Unit,
    onConfirm: (adjustBankBalance: Boolean) -> Unit,
) {
    val effect = remember(tx, bankAccounts) {
        FinanceEngine.getTransactionBankEffect(tx, bankAccounts)
    }
    var adjustBank by remember(tx.id) { mutableStateOf(effect != null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Transaction?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Remove \"${tx.description}\" (${FinanceEngine.formatMoney(tx.amount, currency)})?",
                    fontSize = 14.sp,
                )
                if (effect != null) {
                    val actionLabel = if (effect.delta < 0.0) {
                        "Refund ${FinanceEngine.formatMoney(-effect.delta, currency)} back to ${effect.account.name}"
                    } else {
                        "Deduct ${FinanceEngine.formatMoney(effect.delta, currency)} back from ${effect.account.name}"
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { adjustBank = !adjustBank },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(checked = adjustBank, onCheckedChange = { adjustBank = it })
                        Text(text = actionLabel, fontSize = 13.sp)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(adjustBank) },
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) {
                Text("Delete")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

@Composable
fun DeleteCardDialog(
    card: CreditCard,
    transactionCount: Int,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete ${card.name}?") },
        text = {
            Text(
                text = if (transactionCount > 0) {
                    "This will permanently delete ${card.name} and its $transactionCount recorded ${if (transactionCount == 1) "transaction" else "transactions"}."
                } else {
                    "This will permanently remove ${card.name} from CardLedger."
                },
                fontSize = 14.sp,
            )
        },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) {
                Text("Delete Card")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

@Composable
fun SimpleConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String,
    isDestructive: Boolean = false,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(message, fontSize = 14.sp) },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                ),
            ) {
                Text(confirmLabel)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

@Composable
fun AppLockScreen(
    errorMessage: String?,
    onUnlockClick: () -> Unit,
    onExitApp: () -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    BackHandler { onExitApp() }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = cs.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(cs.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Fingerprint,
                    contentDescription = null,
                    tint = cs.onPrimaryContainer,
                    modifier = Modifier.size(38.dp),
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "CardLedger Locked",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = cs.onSurface,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Verify with your fingerprint or screen lock to view your balances and statements.",
                fontSize = 13.sp,
                color = cs.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            if (!errorMessage.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = errorMessage,
                    fontSize = 12.sp,
                    color = cs.error,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onUnlockClick,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(
                    containerColor = cs.primaryContainer,
                    contentColor = cs.onPrimaryContainer,
                ),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
            ) {
                Icon(Icons.Rounded.Fingerprint, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Unlock CardLedger", fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}
