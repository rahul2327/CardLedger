# CardLedger

**An offline-first Android personal finance application for tracking credit cards, billing cycles, spending categories, and multiple bank accounts privately on your phone.**

CardLedger is maintained and distributed exclusively as a native **Android APK** (`com.rahul2327.cardledger`). It runs 100% offline with local IndexedDB storage—no account sign-up, no servers, and no cloud sync.

---

## Features

### Credit Card & Billing Cycle Management
- Add and manage multiple credit cards with optional credit limits, billing dates, and payment due dates.
- Separate **billed statements** from **current unbilled cycle** spending automatically.
- Track unpaid, partially paid, paid, and overdue statements with due-date countdowns.
- Record full or partial credit card bill payments, with automatic FIFO statement allocation or manual statement selection.

### Multiple Bank Accounts
- Add, edit, and remove multiple bank accounts (e.g., Savings, Salary, Reserve).
- Automatically compute your combined bank balance and **Balance After CC Payments**.
- Deduct credit card payments directly from a chosen bank account, and automatically refund the exact same account if a payment is edited or deleted.

### Spending Categories, Charts & Graphs
- Organize card expenses across 8 categories (Food & Dining, Shopping, Bills & Utilities, Travel & Transit, Fuel & Auto, Health & Wellness, Entertainment, Other) with automatic category detection.
- Interactive **Category Donut Chart** and ranked category breakdown on the Dashboard.
- Monthly **Spend vs. Paid** bar graph and per-card spending comparison with `This Month`, `3M`, `6M`, and `All` timeframe filters.
- Search and filter full transaction history by card, type, date range, bank account, or category.

### Privacy, Offline Storage & Fingerprint Lock
- Works completely offline from first launch—all UI assets and fonts are bundled directly inside the APK.
- Optional **Fingerprint Lock** (Android native `BiometricPrompt`, with device PIN/pattern fallback) to lock CardLedger on startup and when returning from the background.
- Local **JSON Backup & Restore** to keep portable offline copies of your ledger.
- Light, Dark, and System themes inspired by Material You.

---

## Android Application Architecture

CardLedger uses **React 19**, **TypeScript**, **Tailwind CSS**, and **Vite** internally to produce a local static bundle (`dist/`), which **Capacitor** packages directly inside a native Android Gradle project (`android/`).

- **Distribution target:** Android APK only (`com.rahul2327.cardledger`). CardLedger is maintained and distributed exclusively as a native Android application package.
- **Asset loading:** Capacitor serves bundled files locally inside the Android WebView (`https://localhost`) with zero external network requests.
- **Native integrations:** Android status bar & edge-to-edge inset handling, splash screen, keyboard resizing, hardware back navigation, and native AndroidX `BiometricPrompt` fingerprint authentication.
- **Package manager:** [Bun](https://bun.sh/).

---

## Offline-First Functionality, Local Storage & Privacy

All financial data stays exclusively on your Android device:

- **Database:** Local **IndexedDB** (`cardledger_offline_db`) stores your bank accounts, credit cards, transactions, categories, and settings.
- **Zero telemetry or cloud sync:** CardLedger never transmits financial data to external servers and does not require login credentials.
- **Update safety:** Updating CardLedger with an APK signed by the same release key preserves all IndexedDB data across updates.

### JSON Backup & Restore

Because your data is stored only on your device, clearing app storage, uninstalling CardLedger, or switching phones will erase local data unless you keep a backup:

1. Open **Settings → Local Backup & Restore**.
2. Tap **Export JSON** to save a complete local backup file containing your bank accounts, credit cards, transactions, and preferences.
3. Tap **Restore JSON** on any CardLedger installation to validate and restore a previously exported backup (both v1 and v2 backup formats are supported).

---

## Download Android APK from GitHub

Automated Android APK builds are produced via GitHub Actions (`.github/workflows/android-apk.yml`):

1. Visit the repository's [Releases](https://github.com/rahul2327/CardLedger/releases) page (or the latest run under the **Actions** tab).
2. Download the attached `.apk` file onto your Android device.
3. Open the APK to install CardLedger (enable **Install unknown apps** for your browser or file manager if prompted).

### Debug APK Limitations & Release Signing

- If release keystore secrets are not configured in GitHub Actions, the workflow builds a **debug-signed APK** (`app-debug.apk`).
- Each CI runner generates a fresh temporary debug key, meaning:
  - Android will not allow installing a newer debug APK directly over an older one—you must export a JSON backup first, uninstall the old build, install the new build, and restore your JSON backup.
  - **Google Play Protect** may display a warning for unrecognized/debug-signed sideloaded APKs.
- To build a consistently signed **release APK** (`app-release.apk`) in GitHub Actions so updates install in-place without losing local data, add these four repository secrets under **Settings → Secrets and variables → Actions**:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`

---

## Build the Android APK Locally

### Prerequisites

- [Bun](https://bun.sh/)
- Java Development Kit (JDK 21)
- Android SDK / Android Studio
- Git

### 1. Clone and install dependencies

```bash
git clone https://github.com/rahul2327/CardLedger.git
cd CardLedger
bun install
```

### 2. Build the bundled assets and sync Capacitor

```bash
bun run build
bunx cap sync android
```

### 3. Build the Android APK

**Debug APK:**

```bash
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Signed Release APK:**

Provide your keystore via `android/keystore.properties` or the environment variables `CARDLEDGER_STORE_FILE`, `CARDLEDGER_STORE_PASSWORD`, `CARDLEDGER_KEY_ALIAS`, and `CARDLEDGER_KEY_PASSWORD`, then run:

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

You can also open the native project directly in Android Studio with:

```bash
bun run cap:open:android
```

---

## License

CardLedger is licensed under the GNU General Public License v2.0. See the [LICENSE](LICENSE) file for details.
