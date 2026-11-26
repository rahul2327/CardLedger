# CardLedger

**A simple, offline-first personal finance tracker for managing credit cards, expenses, bills, and bank balances.**

CardLedger helps you keep track of your credit card spending, billing cycles, upcoming payments, and available bank balances, all in one place.

Designed with simplicity and privacy in mind, CardLedger stores your financial data locally on your device. No account registration or cloud connection is required.

## ✨ Features

### 💳 Credit Card Management
- Add and manage multiple credit cards.
- Set card names and optional credit limits.
- Configure billing cycle and payment due dates.
- Track spending for individual cards.
- Record credit card bill payments.

### 💰 Expense Tracking
- Add transactions manually.
- Include transaction descriptions, amounts, and dates.
- Edit or delete existing transactions.
- Track spending across different credit cards.
- View transaction history.

### 📅 Billing Cycle Management
- Track statement and unbilled transactions separately.
- Monitor current billing cycle spending.
- Keep track of upcoming payment due dates.
- Record payments against credit card bills.

### 🏦 Bank Balance Tracking
- Maintain bank account balances manually.
- Update balances whenever required.
- Track your available balance alongside credit card obligations.

### 📊 Dashboard
- View your overall financial overview.
- Monitor credit card spending.
- Check upcoming bills and payment due dates.
- Keep track of your bank balances.

### 🔒 Privacy & Data Management
- Works offline.
- Stores data locally using IndexedDB.
- No mandatory account registration.
- No cloud synchronization.
- Export your data as a JSON backup.
- Restore your data from a previous backup.

### 🎨 User Interface
- Material Design 3-inspired interface.
- Light theme.
- Dark theme.
- System theme preference.
- Responsive design.

## 🛠️ Built With

- React 19
- TypeScript
- Vite
- Capacitor
- IndexedDB
- Material Design 3
- Progressive Web App (PWA)

## 📱 Android App

CardLedger can be packaged as a native Android application using Capacitor.

Android APK builds are automated through GitHub Actions.

### Download

Visit the repository's [Releases](https://github.com/rahul2327/CardLedger/releases) page to find available builds.

> Development builds may be debug-signed and are intended for testing.

## 🚀 Run Locally

### Prerequisites

- [Bun](https://bun.sh/)
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/rahul2327/CardLedger.git
```

Navigate to the project directory:

```bash
cd CardLedger
```

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

### Build for Production

```bash
bun run build
```

The production build will be generated in the `dist` directory.

## 🤖 Build Android APK

The Android application uses Capacitor.

Sync the web application with the Android project:

```bash
bunx cap sync android
```

Build a debug APK:

```bash
cd android
./gradlew assembleDebug
```

The generated APK will be available at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Alternatively, use the repository's GitHub Actions workflow to build the APK in the cloud.

## 🔐 Data & Privacy

CardLedger is designed to keep your financial information under your control.

- Financial data is stored locally on your device.
- No account is required.
- No cloud database is required.
- JSON backups allow you to export and restore your data.

**Important:** Clearing application data or uninstalling the app may result in loss of locally stored information. Export regular backups and keep them somewhere safe.

## 📌 Project Goals

CardLedger aims to make personal credit card management easier by bringing spending, billing cycles, payment tracking, and bank balances together in one simple application.

The goal is to provide a lightweight, privacy-focused alternative to complicated personal finance tools.

## 📄 License

CardLedger is licensed under the GNU General Public License v2.0.

See the [LICENSE](LICENSE) file for details.

---

**CardLedger**: Take control of your cards. Track your money. Stay organized.
