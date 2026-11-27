package com.rahul2327.cardledger

import android.os.Bundle
import android.os.SystemClock
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.fragment.app.FragmentActivity
import com.rahul2327.cardledger.biometric.BiometricHelper
import com.rahul2327.cardledger.data.BackupValidationResult
import com.rahul2327.cardledger.domain.FinanceEngine
import com.rahul2327.cardledger.model.CreditCard
import com.rahul2327.cardledger.model.NavTab
import com.rahul2327.cardledger.model.ThemeMode
import com.rahul2327.cardledger.model.Transaction
import com.rahul2327.cardledger.model.TransactionModalPreset
import com.rahul2327.cardledger.ui.modals.AppLockScreen
import com.rahul2327.cardledger.ui.modals.BankAccountsSheet
import com.rahul2327.cardledger.ui.modals.CardFormSheet
import com.rahul2327.cardledger.ui.modals.DeleteCardDialog
import com.rahul2327.cardledger.ui.modals.DeleteTransactionDialog
import com.rahul2327.cardledger.ui.modals.SimpleConfirmDialog
import com.rahul2327.cardledger.ui.modals.TransactionFormSheet
import com.rahul2327.cardledger.ui.screens.BillsScreen
import com.rahul2327.cardledger.ui.screens.CardsScreen
import com.rahul2327.cardledger.ui.screens.DashboardScreen
import com.rahul2327.cardledger.ui.screens.HistoryScreen
import com.rahul2327.cardledger.ui.screens.SettingsScreen
import com.rahul2327.cardledger.ui.theme.CardLedgerTheme
import com.rahul2327.cardledger.ui.theme.LocalCardLedgerColors
import com.rahul2327.cardledger.viewmodel.CardLedgerViewModel
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private val viewModel: CardLedgerViewModel by viewModels()

    private val isAppLocked = mutableStateOf(false)
    private val lockError = mutableStateOf<String?>(null)
    private var isAuthenticating = false
    private var backgroundedAtMs = 0L
    private var lastUnlockedAtMs = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        if (savedInstanceState == null && viewModel.isBiometricLockCached) {
            isAppLocked.value = true
        }

        setContent {
            val state by viewModel.uiState.collectAsState()
            val locked by isAppLocked
            val lockErr by lockError

            CardLedgerTheme(themeMode = state.settings.theme) {
                val systemDark = isSystemInDarkTheme()
                val useDark = when (state.settings.theme) {
                    ThemeMode.DARK -> true
                    ThemeMode.LIGHT -> false
                    ThemeMode.SYSTEM -> systemDark
                }
                val view = LocalView.current
                SideEffect {
                    val controller = WindowCompat.getInsetsController(window, view)
                    controller.isAppearanceLightStatusBars = !useDark
                    controller.isAppearanceLightNavigationBars = !useDark
                }

                if (locked) {
                    LaunchedEffect(Unit) {
                        triggerUnlockPrompt()
                    }
                    AppLockScreen(
                        errorMessage = lockErr,
                        onUnlockClick = { triggerUnlockPrompt() },
                        onExitApp = { finishAffinity() },
                    )
                } else {
                    CardLedgerAppContent(
                        viewModel = viewModel,
                        activity = this@MainActivity,
                        onToggleBiometric = { requestedEnable, showMessage ->
                            handleToggleBiometricLock(requestedEnable, showMessage)
                        },
                    )
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        if (!isAuthenticating && !isChangingConfigurations) {
            backgroundedAtMs = SystemClock.elapsedRealtime()
        }
    }

    override fun onStart() {
        super.onStart()
        viewModel.refreshTodayDate()

        val lockEnabled = viewModel.uiState.value.settings.biometricLockEnabled || viewModel.isBiometricLockCached
        val now = SystemClock.elapsedRealtime()
        val awayDuration = if (backgroundedAtMs > 0L) now - backgroundedAtMs else 0L
        val sinceUnlock = now - lastUnlockedAtMs

        if (lockEnabled && !isAppLocked.value && !isAuthenticating && awayDuration >= 1500L && sinceUnlock >= 2500L) {
            isAppLocked.value = true
            lockError.value = null
            triggerUnlockPrompt()
        }
        backgroundedAtMs = 0L
    }

    private fun triggerUnlockPrompt() {
        if (isAuthenticating) return
        isAuthenticating = true
        lockError.value = null

        BiometricHelper.authenticate(
            activity = this,
            title = "Unlock CardLedger",
            subtitle = "Confirm your fingerprint or screen lock",
        ) { verified, err ->
            isAuthenticating = false
            if (verified) {
                lastUnlockedAtMs = SystemClock.elapsedRealtime()
                isAppLocked.value = false
                lockError.value = null
            } else {
                lockError.value = err ?: "Authentication required."
            }
        }
    }

    private fun handleToggleBiometricLock(
        requestedEnable: Boolean,
        showMessage: (String) -> Unit,
    ) {
        if (requestedEnable && !BiometricHelper.isAvailable(this)) {
            showMessage("Set up a fingerprint or screen lock in Android Settings first.")
            return
        }
        if (isAuthenticating) return
        isAuthenticating = true

        BiometricHelper.authenticate(
            activity = this,
            title = if (requestedEnable) "Enable Fingerprint Lock" else "Disable Fingerprint Lock",
            subtitle = if (requestedEnable) "Verify identity to turn on App Lock" else "Verify identity to turn off App Lock",
        ) { verified, err ->
            isAuthenticating = false
            if (verified) {
                lastUnlockedAtMs = SystemClock.elapsedRealtime()
                viewModel.updateBiometricLock(requestedEnable)
                showMessage(if (requestedEnable) "Fingerprint lock enabled." else "Fingerprint lock disabled.")
            } else {
                showMessage(err ?: "Verification cancelled.")
            }
        }
    }
}

@Composable
private fun CardLedgerAppContent(
    viewModel: CardLedgerViewModel,
    activity: FragmentActivity,
    onToggleBiometric: (Boolean, (String) -> Unit) -> Unit,
) {
    val state by viewModel.uiState.collectAsState()
    val extras = LocalCardLedgerColors.current
    val cs = MaterialTheme.colorScheme
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun showToast(message: String) {
        scope.launch {
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(message)
        }
    }

    var activeTab by remember { mutableStateOf(NavTab.DASHBOARD) }
    var selectedCardId by remember { mutableStateOf<String?>(null) }

    // Modal state
    var showBankSheet by remember { mutableStateOf(false) }
    var showCardSheet by remember { mutableStateOf(false) }
    var editingCard by remember { mutableStateOf<CreditCard?>(null) }
    var showTxSheet by remember { mutableStateOf(false) }
    var editingTx by remember { mutableStateOf<Transaction?>(null) }
    var txPreset by remember { mutableStateOf<TransactionModalPreset?>(null) }
    var deletingTx by remember { mutableStateOf<Transaction?>(null) }
    var deletingCard by remember { mutableStateOf<CreditCard?>(null) }
    var confirmLoadSample by remember { mutableStateOf(false) }
    var confirmResetAll by remember { mutableStateOf(false) }

    val biometricAvailable = remember { BiometricHelper.isAvailable(activity) }

    // SAF Export JSON launcher
    val exportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val json = viewModel.exportBackupJson()
            activity.contentResolver.openOutputStream(uri)?.use { out ->
                out.write(json.toByteArray(Charsets.UTF_8))
                out.flush()
            }
            showToast("Backup exported successfully.")
        } catch (e: Exception) {
            showToast("Failed to export backup: ${e.localizedMessage ?: "Unknown error"}")
        }
    }

    // SAF Import JSON launcher
    val importLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val raw = activity.contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
                ?: throw IllegalStateException("Could not read selected file.")
            when (val res = viewModel.importBackupJson(raw)) {
                is BackupValidationResult.Valid -> {
                    selectedCardId = res.payload.cards.firstOrNull()?.id
                    showToast("Restored ${res.payload.cards.size} cards & ${res.payload.transactions.size} entries.")
                }
                is BackupValidationResult.Invalid -> {
                    showToast(res.error)
                }
            }
        } catch (e: Exception) {
            showToast("Failed to import backup: ${e.localizedMessage ?: "Invalid file"}")
        }
    }

    if (state.isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(cs.background),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    val unpaidBillCount = state.summary.upcomingDueBills.size

    Scaffold(
        containerColor = cs.background,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            // Clean top header showing Today's Date above Screen Title + circular Theme Toggle (no app logo clutter)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(cs.background)
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = FinanceEngine.formatHeaderDate(state.todayDate),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = cs.onSurfaceVariant,
                    )
                    Text(
                        text = activeTab.pageTitle,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = cs.onSurface,
                    )
                }

                IconButton(
                    onClick = {
                        val nextTheme = if (extras.isDark) ThemeMode.LIGHT else ThemeMode.DARK
                        viewModel.updateTheme(nextTheme)
                    },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(extras.surfaceHigh),
                ) {
                    Icon(
                        imageVector = if (extras.isDark) Icons.Rounded.LightMode else Icons.Rounded.DarkMode,
                        contentDescription = "Toggle theme",
                        tint = cs.onSurface,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        },
        floatingActionButton = {
            if (activeTab != NavTab.SETTINGS) {
                val isCardsTab = activeTab == NavTab.CARDS
                ExtendedFloatingActionButton(
                    onClick = {
                        if (isCardsTab) {
                            editingCard = null
                            showCardSheet = true
                        } else {
                            editingTx = null
                            txPreset = null
                            showTxSheet = true
                        }
                    },
                    shape = RoundedCornerShape(18.dp),
                    containerColor = cs.primaryContainer,
                    contentColor = cs.onPrimaryContainer,
                    icon = { Icon(Icons.Rounded.Add, contentDescription = null) },
                    text = { Text(if (isCardsTab) "Add card" else "Add entry", fontWeight = FontWeight.Medium) },
                )
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = extras.surfaceLow,
            ) {
                NavTab.entries.forEach { tab ->
                    val selected = activeTab == tab
                    val icon = when (tab) {
                        NavTab.DASHBOARD -> Icons.Rounded.Dashboard
                        NavTab.CARDS -> Icons.Rounded.CreditCard
                        NavTab.BILLS -> Icons.Rounded.ReceiptLong
                        NavTab.HISTORY -> Icons.Rounded.History
                        NavTab.SETTINGS -> Icons.Rounded.Settings
                    }
                    NavigationBarItem(
                        selected = selected,
                        onClick = { activeTab = tab },
                        icon = {
                            if (tab == NavTab.BILLS && unpaidBillCount > 0) {
                                BadgedBox(
                                    badge = {
                                        Badge {
                                            Text(unpaidBillCount.coerceAtMost(99).toString())
                                        }
                                    },
                                ) {
                                    Icon(icon, contentDescription = tab.label)
                                }
                            } else {
                                Icon(icon, contentDescription = tab.label)
                            }
                        },
                        label = { Text(tab.label, fontSize = 11.sp, maxLines = 1) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (activeTab) {
                NavTab.DASHBOARD -> DashboardScreen(
                    settings = state.settings,
                    summary = state.summary,
                    transactions = state.transactions,
                    todayDate = state.todayDate,
                    onNavigate = { activeTab = it },
                    onSelectCardDetail = { id ->
                        selectedCardId = id
                        activeTab = NavTab.CARDS
                    },
                    onEditBankBalance = { showBankSheet = true },
                    onAddCard = {
                        editingCard = null
                        showCardSheet = true
                    },
                    onOpenTransactionModal = { preset ->
                        editingTx = null
                        txPreset = preset
                        showTxSheet = true
                    },
                    onEditTransaction = { tx ->
                        editingTx = tx
                        txPreset = null
                        showTxSheet = true
                    },
                    onDeleteTransaction = { deletingTx = it },
                    onLoadSampleData = {
                        viewModel.loadSampleData()
                        showToast("Sample data loaded.")
                    },
                )

                NavTab.CARDS -> CardsScreen(
                    settings = state.settings,
                    cardSummaries = state.summary.cardSummaries,
                    transactions = state.transactions,
                    selectedCardId = selectedCardId,
                    todayDate = state.todayDate,
                    onSelectCard = { selectedCardId = it },
                    onAddCard = {
                        editingCard = null
                        showCardSheet = true
                    },
                    onEditCard = { card ->
                        editingCard = card
                        showCardSheet = true
                    },
                    onDeleteCard = { deletingCard = it },
                    onOpenTransactionModal = { preset ->
                        editingTx = null
                        txPreset = preset
                        showTxSheet = true
                    },
                    onEditTransaction = { tx ->
                        editingTx = tx
                        txPreset = null
                        showTxSheet = true
                    },
                    onDeleteTransaction = { deletingTx = it },
                )

                NavTab.BILLS -> BillsScreen(
                    settings = state.settings,
                    summary = state.summary,
                    onAddCard = {
                        editingCard = null
                        showCardSheet = true
                    },
                    onOpenTransactionModal = { preset ->
                        editingTx = null
                        txPreset = preset
                        showTxSheet = true
                    },
                )

                NavTab.HISTORY -> HistoryScreen(
                    settings = state.settings,
                    cards = state.cards,
                    transactions = state.transactions,
                    todayDate = state.todayDate,
                    onEditTransaction = { tx ->
                        editingTx = tx
                        txPreset = null
                        showTxSheet = true
                    },
                    onDeleteTransaction = { deletingTx = it },
                )

                NavTab.SETTINGS -> SettingsScreen(
                    settings = state.settings,
                    cardCount = state.cards.size,
                    transactionCount = state.transactions.size,
                    biometricAvailable = biometricAvailable,
                    onChangeTheme = { viewModel.updateTheme(it) },
                    onToggleBiometricLock = { enabled ->
                        onToggleBiometric(enabled) { msg -> showToast(msg) }
                    },
                    onManageBankAccounts = { showBankSheet = true },
                    onChangeCurrency = {
                        viewModel.updateCurrency(it)
                        showToast("Currency updated to ${it.code}.")
                    },
                    onExportBackup = {
                        exportLauncher.launch("cardledger-backup-${state.todayDate}.json")
                    },
                    onImportBackup = {
                        importLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
                    },
                    onRequestLoadSample = { confirmLoadSample = true },
                    onRequestResetAll = { confirmResetAll = true },
                )
            }
        }
    }

    // Modal Bottom Sheets & Dialogs
    if (showTxSheet) {
        TransactionFormSheet(
            editingTx = editingTx,
            preset = txPreset,
            settings = state.settings,
            cards = state.cards,
            cardSummaries = state.summary.cardSummaries,
            todayDate = state.todayDate,
            onDismiss = {
                showTxSheet = false
                editingTx = null
                txPreset = null
            },
            onSave = { input ->
                viewModel.saveTransaction(input)
                showTxSheet = false
                val wasEdit = editingTx != null
                editingTx = null
                txPreset = null
                showToast(if (wasEdit) "Entry updated." else "Entry saved.")
            },
        )
    }

    if (showCardSheet) {
        CardFormSheet(
            editingCard = editingCard,
            currency = state.settings.currency,
            todayDate = state.todayDate,
            onDismiss = {
                showCardSheet = false
                editingCard = null
            },
            onSave = { input ->
                val saved = viewModel.saveCard(input)
                selectedCardId = saved.id
                val wasEdit = editingCard != null
                showCardSheet = false
                editingCard = null
                showToast(if (wasEdit) "${saved.name} updated." else "${saved.name} added.")
            },
        )
    }

    if (showBankSheet) {
        BankAccountsSheet(
            settings = state.settings,
            totalCCOutstanding = state.summary.totalCCOutstanding,
            onDismiss = { showBankSheet = false },
            onSaveAccount = { input ->
                val saved = viewModel.saveBankAccount(input)
                showToast("${saved.name} saved.")
            },
            onDeleteAccount = { accountId ->
                viewModel.deleteBankAccount(accountId)
                showToast("Bank account removed.")
            },
        )
    }

    deletingTx?.let { tx ->
        DeleteTransactionDialog(
            tx = tx,
            bankAccounts = state.settings.bankAccounts,
            currency = state.settings.currency,
            onDismiss = { deletingTx = null },
            onConfirm = { adjustBank ->
                viewModel.deleteTransaction(tx.id, adjustBank)
                deletingTx = null
                showToast("Transaction deleted.")
            },
        )
    }

    deletingCard?.let { card ->
        val txCount = state.transactions.count { it.cardId == card.id }
        DeleteCardDialog(
            card = card,
            transactionCount = txCount,
            onDismiss = { deletingCard = null },
            onConfirm = {
                viewModel.deleteCard(card.id)
                if (selectedCardId == card.id) selectedCardId = null
                deletingCard = null
                showToast("${card.name} deleted.")
            },
        )
    }

    if (confirmLoadSample) {
        SimpleConfirmDialog(
            title = "Load Sample Data?",
            message = "This replaces your current local cards, bank accounts, and transactions with a sample dataset.",
            confirmLabel = "Load Sample",
            onDismiss = { confirmLoadSample = false },
            onConfirm = {
                viewModel.loadSampleData()
                confirmLoadSample = false
                selectedCardId = null
                showToast("Sample dataset loaded.")
            },
        )
    }

    if (confirmResetAll) {
        SimpleConfirmDialog(
            title = "Reset All Local Data?",
            message = "This permanently deletes all cards, transactions, and resets bank balances on this device. Export a JSON backup first if you want to keep your records.",
            confirmLabel = "Reset Everything",
            isDestructive = true,
            onDismiss = { confirmResetAll = false },
            onConfirm = {
                viewModel.clearAllData()
                confirmResetAll = false
                selectedCardId = null
                showToast("All local data cleared.")
            },
        )
    }
}
