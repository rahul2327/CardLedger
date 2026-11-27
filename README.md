# CardLedger — Native Android App

CardLedger is a **100% pure native Android application** built with **Kotlin**, **Jetpack Compose**, and **Material 3** for tracking credit cards, billing cycles, bill payments, cashback rewards, direct Bank / UPI spending, and bank balances completely offline.

- **Application ID:** `com.rahul2327.cardledger`
- **Minimum Android Version:** Android 7.0 (API 24)
- **Target SDK:** Android 16 (API 36)
- **Network Access:** None — the Android manifest declares **zero `INTERNET` permission**

---

## Architecture

CardLedger runs natively on Android with **no WebView, no Capacitor, no HTML/JS wrapper, and no cloud backend**:

- **Language & UI:** Kotlin 2.1 + Jetpack Compose + Material 3 (`android/app/src/main/java/com/rahul2327/cardledger/`)
- **Financial Engine:** Pure Kotlin billing cycle & FIFO statement settlement engine (`domain/FinanceEngine.kt`)
- **Charts:** Native Jetpack Compose `Canvas` donut chart, ranked category progress bars, monthly spend vs. paid grouped bar chart, and source breakdown (`ui/components/SpendingCharts.kt`)
- **Local Storage:** Atomic internal storage JSON ledger (`filesDir/cardledger_data.json`) with full v1 & v2 backup compatibility (`data/LocalStorage.kt`)
- **Security:** Native Android `BiometricPrompt` (`BIOMETRIC_WEAK | DEVICE_CREDENTIAL`) with cold-launch and background re-lock (`biometric/BiometricHelper.kt`)
- **Backup & Restore:** Native Android Storage Access Framework (SAF) JSON export and import

---

## Features

- **Multi-Bank Balance Tracking:** Manage multiple bank accounts with live total cash on hand and net balance after credit card dues.
- **Credit Cards & Billing Cycles:** Custom billing day and due day per card, automatic open/generated statement separation, FIFO payment settlement, overdue/unpaid/partially paid/paid statuses, and credit limit utilization bars.
- **4 Transaction Types:**
  - **Card Spend** (categorized automatically or manually)
  - **Bank / UPI Spend** (for merchants that don't accept RuPay credit cards, deducting directly from your chosen bank account)
  - **Card Bill Payment** (optional automatic bank balance deduction + statement targeting)
  - **Credit Card Cashback** (either reduces the card statement/outstanding or credits directly to a bank account)
- **Spending Insights:** Interactive donut chart by category, monthly spend vs. paid bar graph with cashback summary, and spending breakdown by card & bank/UPI across `This Month`, `3M`, `6M`, and `All`.
- **Fingerprint & Screen Lock:** Native biometric lock on launch and when returning from background.
- **Light & Dark Material You Themes:** Toggleable from the top bar or Settings (`Light`, `Dark`, or `System`).
- **Offline JSON Backup & Restore:** Export and restore your full ledger via Android's system file picker.

---

## Download APK from GitHub Releases

Every push to `main` (and manual workflow dispatch) runs `.github/workflows/android-apk.yml` to compile the native Kotlin project with Gradle and publish a ready-to-install APK to **GitHub Releases** and workflow artifacts.

1. Open the repository's **Releases** page on GitHub.
2. Download the latest `CardLedger-*.apk` asset.
3. Install it on your Android phone (allow installing from your browser/Files app if prompted).

> **Upgrading from an older WebView/Capacitor build:** Before installing the new native APK, export a JSON backup from **Settings → Export JSON** in the old app, then restore it via **Settings → Import JSON** in the new native app. Both versions share the same CardLedger JSON backup schema.

---

## Build Locally with Gradle

Requirements: **JDK 21** and **Android SDK** (API 36).

```bash
cd android
./gradlew assembleDebug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To build a release APK with your own signing keystore, create `android/keystore.properties` (or pass `KEYSTORE_*` environment variables) and run:

```bash
cd android
./gradlew assembleRelease
```

---

## Privacy & Debug APK Notes

- All data is stored exclusively inside the app's private internal Android storage (`filesDir/cardledger_data.json`).
- Because the app requests **no `INTERNET` permission**, Android itself guarantees that zero network traffic or analytics can ever leave the device.
- Debug APKs are signed with the standard Android debug key and are intended for personal sideloading. Export a JSON backup before uninstalling the app, as Android removes app-private storage on uninstall.
