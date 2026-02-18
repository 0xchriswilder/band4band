# Payroll add-ons ideation

You’ve **met the bounty requirements**. This doc lists features established payroll products often have, what we already cover, and which **add-ons** are most valuable and feasible.

---

## Bounty status (quick check)

| Bounty ask | Status |
|------------|--------|
| Employer adds employees + sets encrypted salaries | ✅ Onboard single/batch, encrypted salary |
| Salaries confidential (only employer + employee) | ✅ FHE + ACL, relayer decrypt |
| Employer runs payroll confidentially | ✅ paySalary / batchPaySalaries |
| Employees verify & decrypt own payment | ✅ History + Decrypt button |
| Extra usability/real-world features | ✅ Company profile, names, import, charts, invoices, CSV export |

So you’re good for the bounty. Below is for **optional add-ons** only.

---

## What established payroll companies usually have

Rough list (Gusto, ADP, Paychex, Rippling, etc.):

1. **Pay schedules / pay periods** – When is the next pay date? Calendar view.
2. **Tax withholding & forms** – W-2, 1099, withholdings (very jurisdiction-specific).
3. **Direct deposit / payment methods** – We have on-chain cUSDC; they have ACH/bank.
4. **Audit trail & compliance** – Who paid whom, when; immutable records.
5. **Employee self-service** – View pay history, update profile, download pay stubs.
6. **Approval workflows** – Manager approves → finance runs payroll (multi-role).
7. **Multiple pay rates / job codes** – Different roles, hourly vs salary.
8. **Bonuses / one-off payments** – Extra payments outside base salary.
9. **Deductions** – Benefits, 401k, etc.
10. **Year-to-date (YTD) totals** – “You’ve been paid $X this year.”
11. **Pay stubs** – Per-payment document (gross, net, date, employer).
12. **Notifications** – “Payroll run Friday,” “You were paid.”
13. **Multi-currency / multi-token** – We have cUSDCP; some support several tokens.
14. **Recurring payroll scheduling** – “Run payroll every 2nd Friday” (automation).
15. **Role-based access** – Admin vs viewer; we have single employer wallet.
16. **Company branding** – Name, logo; we have this.
17. **Onboarding checklist** – W-4, I-9, bank details; we have wallet + optional name/email.
18. **Payment proof / payslip** – Downloadable proof for one payment (for loans, rentals).
19. **Payment status** – Pending / Processing / Completed / Failed.
20. **Reimbursements / expenses** – Separate from salary.

---

## Profile complete badge (employee)

- **Where:** Employee Portal header, next to the FHE badge.
- **Requirements to see “Profile complete” (green):** Your **name** and **email** must both be set in the app (stored in `employee_display_names` for your employer). Either the employer can set them when onboarding/editing, or **you** can click the “Add name & email” / “Add email” badge to open a modal and save them yourself.
- **Why it’s for the employee:** So you can complete your own profile and control your contact info; the employer can also set it when they onboard or edit your record.

---

## What we already have (no need to double-count)

- Company profile (name, logo, industry, website)  
- Employee names & emails (Supabase)  
- Payment frequency (monthly / biweekly / weekly)  
- CSV/XLSX import with preview-before-onboard  
- Transaction history (employer + employee) + charts + CSV export  
- Invoicing (submit + mark paid)  
- Unwrap cUSDC → USDC  
- Audit trail (on-chain + indexer; we have tx_hash, timestamps)

---

## Out of scope (for this demo) or heavy

- **Tax withholding, W-2/1099** – Jurisdiction-specific, legal; leave to real payroll products.
- **True direct deposit (ACH)** – Off-chain banking; we’re on-chain only.
- **Multi-step approval** – Would need roles/permissions; bigger design.
- **Deductions / benefits** – Complex product surface; skip for add-ons.
- **Recurring auto payroll** – Needs cron/backend or chain automation; non-trivial.
- **Multi-token payroll in one run** – Possible later; not required for bounty.

---

## Add-ons worth adding (by impact vs effort)

### High impact, relatively low effort

1. **Pay stub / payment proof download**  
   - **What:** For each payment, employee (or employer) can download a simple “pay stub”: date, employer name, amount (if decrypted), tx link, payment ID.  
   - **Why:** “Proof of income” for rentals, loans; feels like a real payroll product.  
   - **How:** Frontend-only: build a blob (PDF or HTML) or structured JSON from existing payment + decrypted amount; trigger download.

2. **Year-to-date (YTD) for employees**  
   - **What:** On Employee dashboard: “Total received this year” (or “this month”).  
   - **Why:** Standard in every payroll product; answers “how much did I get paid?”  
   - **How:** Sum payments in current year (from existing history). If you want YTD in plaintext, use batch decrypt for that employee’s payments then sum; otherwise show “X payments – Decrypt to see total.”

3. **Next pay date / pay calendar hint**  
   - **What:** Employer dashboard: “Next suggested pay: Mar 15” or “Pay period ends Mar 14.”  
   - **Why:** Reminds employer when to run payroll; aligns with payment frequency.  
   - **How:** From last payment date (or “now”) + employee payment frequency (monthly/biweekly/weekly), compute next date; show one line or a small list.

4. **Payroll run summary (employer)**  
   - **What:** After a run (or in history): “Run of Mar 1: 5 employees, total $X” (total can be “decrypt to see” or from decrypted amounts).  
   - **Why:** Matches “payroll report” expectation; good for internal record.  
   - **How:** We already have payroll_runs (or can derive from salary_payments by tx_hash). Add a “Run summary” view/modal or a one-click “Download run summary” (e.g. CSV/HTML) for that run.

5. **Employee “profile complete” / onboarding status**  
   - **What:** Badge or line: “Profile complete” if name + email set; else “Add name & email so your employer can reach you.”  
   - **Why:** Nudges employees to fill metadata; feels polished.  
   - **How:** Frontend-only: check existing employee_display_names (name, email) and show a small status.

### Medium impact, still reasonable

6. **Payment status**  
   - **What:** Per payment: Pending → Processing → Completed (and optionally Failed).  
   - **Why:** Clear state for user; some blockchains/UIs show “pending” before confirmation.  
   - **How:** Derive from tx receipt (pending/confirmed) or from indexer (we already have final state); optional “failed” if you ever track reverted txs.

7. **In-app reminder / banner**  
   - **What:** Employer: “You have 3 unpaid invoices” or “Last payroll: 2 weeks ago.” Employee: “Your last payment was Dec 1.”  
   - **Why:** Light “notification” without building email/push.  
   - **How:** Frontend: one query (invoices, last payment date); show a small banner or card.

8. **Bonuses / one-off payment label**  
   - **What:** When running payroll, option to mark a payment as “Bonus” or “One-off” so it shows differently in history.  
   - **Why:** Matches real payrolls (salary vs bonus).  
   - **How:** Either a new field in UI + Supabase (payment_type: salary | bonus) and optional indexer/event, or just a label in the frontend for “this run was a bonus run” (lighter).

---

## Suggested priority for add-ons

If you add **only a few**, these give the most “real payroll” feel for the demo and judges:

1. **Pay stub / payment proof** – Strong “proof of income” story; easy to show in video.  
2. **YTD for employees** – Expected in any payroll product; reuses existing data + optional batch decrypt.  
3. **Next pay date (employer)** – Shows you thought about pay schedule; small logic.  
4. **Payroll run summary** – Employer-side “report” that mirrors real payroll reports.  
5. **Profile complete badge** – Quick UX polish.

Implementation order could be: **YTD** → **Pay stub download** → **Next pay date** → **Run summary** → **Profile complete**. That order gives you visible “employee side” and “employer side” improvements fast.

---

## Summary

- **Bounty:** You’ve met it; no extra features required.  
- **Add-ons:** Focus on **pay stub**, **YTD**, **next pay date**, **run summary**, and **profile complete** for maximum impact with limited scope. Skip tax, ACH, deductions, and heavy automation for this round.
