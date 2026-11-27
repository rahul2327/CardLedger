# CardLedger

**A privacy-focused, offline-first personal finance tracker for Android.**

CardLedger helps you manage credit cards, track expenses, monitor billing cycles, record payments, and keep an eye on your bank balances, all from one place.

Built with React and Capacitor, CardLedger is distributed as an Android application. Your financial data stays on your device, giving you control over your personal financial information.

## Features

### 💳 Credit Card Management
- Add and manage multiple credit cards.
- Set card names and optional credit limits.
- Configure billing cycles and payment due dates.
- Track spending across individual cards.
- Record credit card bill payments.

### 💰 Expense Tracking
- Add transactions manually.
- Include transaction descriptions, amounts, and dates.
- Edit or delete transactions.
- View transaction history.
- Track expenses across multiple cards.

### 📅 Billing Cycle Management
- Track statement and unbilled transactions separately.
- Monitor current billing cycle spending.
- Keep track of upcoming payment due dates.
- Record payments against credit card bills.

### 🏦 Bank Balance Tracking
- Maintain multiple bank account balances.
- Update balances manually.
- Monitor available bank balances alongside credit card obligations.

### 📊 Financial Dashboard
- Get an overview of your finances.
- Monitor credit card spending.
- Check upcoming bills and payment deadlines.
- Keep track of bank balances.

### 🔒 Privacy & Data Management
- Offline-first functionality.
- Local data storage using IndexedDB.
- No mandatory account registration.
- No cloud synchronization.
- Export financial data as JSON.
- Restore data from JSON backups.

### 🎨 User Interface
- Material Design 3-inspired interface.
- Light and dark themes.
- System theme preference.
- Responsive Android interface.

## Screenshots

<!-- Add application screenshots here -->

## Download

Download the latest Android APK from the GitHub Releases page.

**[Download CardLedger](https://github.com/rahul2327/CardLedger/releases)**

Development builds may be debug-signed and are intended for testing.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 19 | Application interface |
| TypeScript | Type safety |
| Vite | Build tooling |
| Capacitor 8 | Native Android integration |
| IndexedDB | Local data storage |
| Material Design 3 | User interface |

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)
- Android Studio or Android SDK
- Java Development Kit (JDK)

### Clone the Repository

```bash
git clone https://github.com/rahul2327/CardLedger.git
cd CardLedger
```

### Install Dependencies

```bash
bun install
```

### Build Android APK

Build and synchronize the application with the Android project:

```bash
bun run cap:sync
```

Build a debug APK:

```bash
cd android
./gradlew assembleDebug
```

Alternatively, build directly from the project root:

```bash
bun run android:build
```

The generated APK will be available at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Release APK

```bash
bun run android:release
```

Release signing configuration may be required before distributing a production APK.

## Automated Builds

CardLedger uses GitHub Actions to automate Android APK builds.

You can trigger a build through the repository's Actions tab and download the generated APK from the workflow artifacts.

## Privacy & Data

CardLedger is designed with privacy as a priority.

- Your financial information is stored locally on your device.
- No account registration is required.
- No cloud database is required for storing your financial records.
- You can export and restore your data using JSON backups.

**Important:** Uninstalling the application or clearing its storage may permanently erase locally stored information. Export regular backups to keep your financial records safe.

## License

CardLedger is licensed under the **GNU General Public License v2.0 (GPL-2.0)**.

See the [LICENSE](LICENSE) file for details.

---

**CardLedger**

*Track your cards. Manage your money. Stay in control.*
