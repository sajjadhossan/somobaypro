# Digital Society Management System (ডিজিটাল সোসাইটি ম্যানেজমেন্ট সিস্টেম)
## প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড (Progoti Kalyan Somobay Samity Ltd.)

A complete, production-ready, secure, and modern centralized software platform designed and developed for a Bangladeshi society.

---

### ⚠️ IMPORTANT BUSINESS REQUIREMENT: STRICT NO-LOAN POLICY
> **THIS SOCIETY WILL NOT PROVIDE ANY LOANS.**
> No loan, lending, borrowing, interest, loan repayment, or loan application functionality exists in this system.
> The system strictly focuses on membership, monthly subscriptions, bank deposits, payment verification, digital receipts, QR verification, double-entry accounting, administration, and society management.

---

## 🚀 Key Highlights & Architecture

- **Full-Stack Architecture**: Single centralized platform with modern React frontend and Node.js + Express backend.
- **Embedded High-Performance Database**: Powered by Node.js native `DatabaseSync` (`node:sqlite`) with Write-Ahead Logging (WAL) and foreign keys enabled.
- **Mobile-First Member Experience**: Designed for seamless smartphone use by registered members with bottom-navigation, mobile receipt viewer, and deposit submission.
- **Double-Entry Accounting Engine**: Strict general ledger, chart of accounts (Assets, Liabilities, Equity, Revenue, Expense), balanced debits and credits, cashbook, bankbook, and audit-compliant reversal entries (no silent deletions).
- **Digital Receipts with QR Verification**: Official money receipts with cryptographically secure tokens, QR codes, authorized signatures, PDF/print-ready CSS, and public verification without login.
- **Role-Based Access Control (RBAC)**: 7 primary roles with tailored dashboard views and backend permission enforcement.
- **Bilingual Interface**: Instant toggle between Bengali (বাংলা) and English across all dashboards and receipts.

---

## 👥 7 Primary User Roles & Test Credentials

The system comes pre-seeded with realistic Bangladeshi society data and test credentials for all 7 primary roles. You can also use the **One-Click Role Login** buttons directly on the login page:

| Role | Bengali Title | Mobile / Identifier | Password | Default Member ID |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | সুপার এডমিন (প্রধান নিয়ন্ত্রক) | `01711000001` | `Password123!` | `SOC-2026-0001` |
| **Admin** | এডমিন (প্রশাসক) | `01711000002` | `Password123!` | `SOC-2026-0002` |
| **President** | সভাপতি (কার্যনির্বাহী পরিষদ) | `01711000003` | `Password123!` | `SOC-2026-0003` |
| **General Secretary** | সাধারণ সম্পাদক | `01711000004` | `Password123!` | `SOC-2026-0004` |
| **Treasurer / Cashier** | কোষাধ্যক্ষ (অর্থ সম্পাদক) | `01711000005` | `Password123!` | `SOC-2026-0005` |
| **Advisor** | উপদেষ্টা পরিষদ | `01711000006` | `Password123!` | `SOC-2026-0006` |
| **General Member** | সাধারণ সদস্য | `01711000007` | `Password123!` | `SOC-2026-0007` |

---

## 📋 Complete 36 Modules Implementation

1. **Society Profile and Branding**: Name (BN/EN), Reg No (`REG-DH-2018-0942`), Address, Contact, Logo, Signature, Receipt Footer.
2. **Super Admin Dashboard**: Full control, key metrics, approvals queue, database backup download.
3. **Admin Dashboard**: Operational member management, approvals, notices, documents.
4. **President Dashboard**: Executive oversight, collection statistics, governance.
5. **General Secretary Dashboard**: Membership applications, meetings, minutes, notices.
6. **Treasurer / Cashier Dashboard**: Deposit slip verification queue, cashbook, bankbook, ledger.
7. **Advisor Dashboard**: Member directory, financial statement review, advisory recommendations.
8. **General Member Dashboard**: Personal stats, status, monthly dues, pending deposits, digital receipts.
9. **Member Registration**: Method A (Admin-created) + Method B (Public self-registration).
10. **Member Account Creation**: Unique ID format (`SOC-2026-XXXX`).
11. **Member Login & Authentication**: Mobile/ID + Password, login throttling (15-min lockout after 5 failed attempts).
12. **Role-Based Access Control (RBAC)**: Backend-enforced authorization and granular permissions.
13. **Member Profile Management**: Full personal, nominee, and emergency contact details.
14. **Membership Status Management**: Active, Pending, Suspended, Inactive, Resigned, Terminated.
15. **Monthly Subscription Management**: Auto-generation of dues for active members without altering history.
16. **Monthly Due Management**: Month-wise due tracking, partial payments, overdue detection.
17. **Bank Account Management**: Sonali Bank PLC & Dutch-Bangla Bank PLC tracking.
18. **Bank Deposit Submission**: Deposit submission with slip attachment and transaction reference.
19. **Deposit Slip Verification**: Treasurer checks slip against bank statement before approval.
20. **Payment Approval Workflow**: Multi-stage approval (Treasurer / President / Super Admin).
21. **Digital Receipt Generation**: Official receipt number format (`RCP-2026-000001`), print & PDF view.
22. **QR Code Receipt Verification**: Tamper-proof public verification URL (`/verify/RCP-2026-000001`) masking sensitive data.
23. **Income Management**: Subscriptions, admission fees, donations, bank profits.
24. **Expense Management**: Vouchers for office rent, utility, salary, stationery, maintenance, events.
25. **Cashbook and Bankbook**: Daily cash in/out, bank deposits/withdrawals, reconciliations.
26. **Double-Entry Accounting**: Balanced debit/credit general ledger with immutable reversal entries.
27. **Financial Reports**: Balance sheet, collection summaries, top payers and defaulters.
28. **Meeting Management**: Meeting schedule, agenda, attendance, minutes, resolutions.
29. **Notice Management**: Role-targeted notices with priority levels (urgent, important, normal) and read tracking.
30. **Notification System**: In-app alerts and notifications for approvals, dues, and announcements.
31. **Document Management**: Official society documents, bylaws, and audit reports.
32. **Help and Support**: Member complaint/inquiry ticket system with official resolution workflow.
33. **Audit Logs**: Comprehensive logging of sensitive actions with IP and before/after values.
34. **Login History**: Tracks login attempts, IPs, user agents, and lockout states.
35. **Database Backup**: 1-click SQLite database backup download.
36. **System Settings**: Society branding, default rates, and workflow configuration.

---

## 🛠️ Running the Application

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed Database (Pre-configured)
```bash
pnpm run seed
```

### 3. Build Client (Production)
```bash
pnpm run build:client
```

### 4. Start Production Server
```bash
pnpm run start
```
The application will be accessible at `http://localhost:4000` (or your local network IP on mobile).

---

## 🔒 Security & Privacy Measures

- Cryptographically secure unguessable tokens for public QR verification.
- Masked Member IDs on public pages (`SOC-****-0007`).
- Never exposes NID, private phone numbers, bank accounts, or deposit slips on public pages.
- Passwords hashed using `bcryptjs` with salt rounds.
- Login attempt throttling and brute-force lockout.
- Server-side JWT authorization and role verification.
