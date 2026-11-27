package com.rahul2327.cardledger.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.AppSettings
import com.rahul2327.cardledger.model.CurrencyCode
import com.rahul2327.cardledger.model.ThemeMode
import com.rahul2327.cardledger.ui.components.LedgerCard
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.ui.theme.MonoFontFamily

@Composable
fun SettingsScreen(
    settings: AppSettings,
    cardCount: Int,
    transactionCount: Int,
    biometricAvailable: Boolean,
    onChangeTheme: (ThemeMode) -> Unit,
    onToggleBiometricLock: (Boolean) -> Unit,
    onManageBankAccounts: () -> Unit,
    onChangeCurrency: (CurrencyCode) -> Unit,
    onExportBackup: () -> Unit,
    onImportBackup: () -> Unit,
    onRequestLoadSample: () -> Unit,
    onRequestResetAll: () -> Unit,
) {
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val currency = settings.currency

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Appearance
        item {
            LedgerCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(Icons.Rounded.Palette, contentDescription = null, tint = cs.primary, modifier = Modifier.size(20.dp))
                    Column {
                        Text("Appearance", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                        Text("Choose Light, Dark, or follow Android System", fontSize = 12.sp, color = cs.onSurfaceVariant)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ThemeMode.entries.forEach { mode ->
                        val active = settings.theme == mode
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onChangeTheme(mode) },
                            shape = RoundedCornerShape(50),
                            color = if (active) cs.primaryContainer else extras.surfaceHigh,
                            border = BorderStroke(
                                1.dp,
                                if (active) cs.primary.copy(alpha = 0.5f) else cs.outlineVariant.copy(alpha = 0.5f),
                            ),
                        ) {
                            Box(
                                modifier = Modifier.padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = mode.label,
                                    fontSize = 13.sp,
                                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                    color = if (active) cs.onPrimaryContainer else cs.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        // Fingerprint / Screen Lock
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(cs.primaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Fingerprint,
                                contentDescription = null,
                                tint = cs.onPrimaryContainer,
                                modifier = Modifier.size(22.dp),
                            )
                        }
                        Column {
                            Text(
                                text = "Fingerprint & Screen Lock",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                            Text(
                                text = if (biometricAvailable) {
                                    "Lock CardLedger on launch & when returning from background"
                                } else {
                                    "Set up fingerprint or screen lock in Android Settings first"
                                },
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(
                        checked = settings.biometricLockEnabled,
                        onCheckedChange = { onToggleBiometricLock(it) },
                        enabled = biometricAvailable || settings.biometricLockEnabled,
                    )
                }
            }
        }

        // Bank Accounts
        item {
            LedgerCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.AccountBalance, contentDescription = null, tint = cs.primary, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Bank Accounts", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                            Text(
                                text = "${settings.bankAccounts.size} ${if (settings.bankAccounts.size == 1) "account" else "accounts"} · Total ${FinanceEngine.formatMoney(FinanceEngine.getTotalBankBalance(settings), currency)}",
                                fontSize = 12.sp,
                                color = cs.onSurfaceVariant,
                            )
                        }
                    }
                    FilledTonalButton(
                        onClick = onManageBankAccounts,
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        modifier = Modifier.height(36.dp),
                    ) {
                        Text("Manage", fontSize = 13.sp)
                    }
                }
                if (settings.bankAccounts.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        settings.bankAccounts.forEach { acc ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(acc.name, fontSize = 13.sp, color = cs.onSurfaceVariant)
                                Text(
                                    text = FinanceEngine.formatMoney(acc.balance, currency),
                                    fontSize = 13.sp,
                                    fontFamily = MonoFontFamily,
                                    fontWeight = FontWeight.Medium,
                                    color = cs.onSurface,
                                )
                            }
                        }
                    }
                }
            }
        }

        // Display Currency
        item {
            LedgerCard {
                Text("Display Currency", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text("Formats all monetary balances and charts", fontSize = 12.sp, color = cs.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CurrencyCode.entries.chunked(2).forEach { pair ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            pair.forEach { code ->
                                val active = settings.currency == code
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { onChangeCurrency(code) },
                                    shape = RoundedCornerShape(16.dp),
                                    color = if (active) cs.primaryContainer else extras.surfaceHigh,
                                    border = BorderStroke(
                                        1.dp,
                                        if (active) cs.primary.copy(alpha = 0.5f) else cs.outlineVariant.copy(alpha = 0.5f),
                                    ),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text(
                                            text = code.symbol,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (active) cs.onPrimaryContainer else cs.onSurface,
                                        )
                                        Text(
                                            text = code.code,
                                            fontSize = 13.sp,
                                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                            color = if (active) cs.onPrimaryContainer else cs.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Local JSON Backup & Restore
        item {
            LedgerCard {
                Text("Local JSON Backup", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text(
                    text = "Export or restore your $cardCount ${if (cardCount == 1) "card" else "cards"} and $transactionCount ${if (transactionCount == 1) "entry" else "entries"} (compatible with CardLedger v1 & v2 backups).",
                    fontSize = 12.sp,
                    color = cs.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Button(
                        onClick = onExportBackup,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = cs.primaryContainer,
                            contentColor = cs.onPrimaryContainer,
                        ),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Export JSON", fontSize = 13.sp)
                    }
                    FilledTonalButton(
                        onClick = onImportBackup,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Import JSON", fontSize = 13.sp)
                    }
                }
            }
        }

        // Sample Data & Reset
        item {
            LedgerCard {
                Text("Data Management", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text("Explore with realistic Indian cards & UPI sample entries, or start fresh.", fontSize = 12.sp, color = cs.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    FilledTonalButton(
                        onClick = onRequestLoadSample,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Load Sample", fontSize = 12.sp)
                    }
                    OutlinedButton(
                        onClick = onRequestResetAll,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = cs.error),
                        border = BorderStroke(1.dp, cs.error.copy(alpha = 0.55f)),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.DeleteForever, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Reset All", fontSize = 12.sp)
                    }
                }
            }
        }

        // Offline Privacy Card
        item {
            LedgerCard(containerColor = extras.surfaceLow) {
                Row(
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(extras.successContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Security,
                            contentDescription = null,
                            tint = extras.onSuccessContainer,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(Icons.Rounded.Lock, contentDescription = null, tint = extras.success, modifier = Modifier.size(14.dp))
                            Text(
                                text = "100% Native Offline App",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = cs.onSurface,
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Built purely in native Kotlin & Jetpack Compose with zero internet permission. Your cards, balances, and transactions never leave this device.",
                            fontSize = 12.sp,
                            color = cs.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
