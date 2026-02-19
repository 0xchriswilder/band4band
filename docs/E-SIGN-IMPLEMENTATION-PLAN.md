# E-sign implementation plan (free, no API cost)

Use a **free** e-sign provider so no API key cost or subscription is needed. Two options:

---

## Option A: DocuSign sandbox (easiest to start)

- **Cost:** Free. No credit card.
- **Sign up:** [DocuSign Developer Sandbox](https://go.docusign.com/sandbox/productshot/) — name, email, country. Instant access.
- **Limitation:** Sandbox only (demo/test). For production you’d switch to a paid plan or Option B.
- **Best for:** Bounty demo and quick integration.

**Steps:**

1. **Create DocuSign developer account**  
   Go to [go.docusign.com/sandbox](https://go.docusign.com/sandbox/productshot/), sign up. No API key request — you get a sandbox environment.

2. **Get Integration Key (API key)**  
   In DocuSign Admin (sandbox): Apps and Keys → Add App and Integration Key. Copy the **Integration Key**. Use it as the client ID in OAuth or (in sandbox) you can use JWT or legacy “Send on behalf” flows; for simplest demo, use **Authorization Code** or **Quickstart** in DocuSign docs to get an access token.

3. **Optional: use DocuSign Quickstart**  
   DocuSign’s “Quickstart” in the developer center generates a one-time code so you can get an access token without building full OAuth first. Use that token to call the eSignature API (create envelope, send to signer).

4. **Backend / Supabase**  
   - **Table:** `employment_contracts`  
     - `id` (uuid), `payroll_address` (text), `employee_address` (text), `employer_address` (text),  
     - `envelope_id` (text, from DocuSign), `status` (text: `sent` | `signed` | `declined`),  
     - `signed_at` (timestamptz, nullable), `created_at` (timestamptz).  
   - No separate backend server required: call DocuSign from the **frontend** with a short-lived token, or use a **Supabase Edge Function** (or Next.js API route if you add one) to hold the Integration Key and create envelopes. For “easiest” with no backend, DocuSign supports **embedded signing**: you create the envelope from a small serverless function (e.g. Supabase Edge Function) that uses the Integration Key + private key or auth code to get an access token and create the envelope, then return the signing URL to the frontend.

5. **Frontend flows**  
   - **Employer:** In “Contracts” or employee row: “Send contract”. Pick employee (we have address + email from Supabase). Call your Edge Function with `employee_address`, `employee_email`, `payroll_address`; function calls DocuSign API, stores `envelope_id` + `status: sent` in `employment_contracts`, returns signing URL or “Contract sent”.  
   - **Employee:** “Contract” page or link: list contracts where `employee_address = current wallet`. Show “Sign” button that opens DocuSign signing URL (embedded or redirect). After signing, DocuSign redirects to your app; in that redirect handler, call DocuSign API to get envelope status (or use webhook later), update `employment_contracts` to `status: signed`, `signed_at = now()`.

6. **Template vs on-the-fly**  
   In sandbox, you can create a **template** in the DocuSign UI (one signer = employee) and pass role/email when creating the envelope. That avoids generating PDFs in code. Alternatively, create envelope from a PDF blob (e.g. a base64 employment agreement) if you add a simple template in the repo.

**Summary:** Sign up (free) → get Integration Key → Supabase table + Edge Function (or minimal backend) to create envelope and return signing URL → frontend “Send contract” and “Sign contract” → redirect or poll to set `signed`. No paid API.

---

## Option B: Inkless (free tier, production-ready)

- **Cost:** Free tier: unlimited documents, unlimited recipients. No credit card.
- **Sign up:** Request API key by email: hello@useinkless.com (use case + volume). Then use REST API with `x-api-key` header.
- **Docs:** [Inkless Quickstart](https://docs.useinkless.com/quickstart).
- **Best for:** Free production use after one-time API key request.

**Steps:**

1. **Get API key**  
   Email hello@useinkless.com; request API key for “confidential payroll employment contracts”. No payment.

2. **Create a template (once)**  
   In [Inkless app](https://app.useinkless.com/templates): upload a PDF (e.g. simple employment agreement), add signer fields, save. Copy **template ID**.

3. **Backend / Supabase**  
   Same idea as Option A: table `employment_contracts` with `envelope_id` (or Inkless document id), `status`, `signed_at`. Call Inkless from a **Supabase Edge Function** (or small backend) so the API key is not in the frontend:  
   `POST https://api.useinkless.com/createFromTemplate` with `x-api-key`, template ID, and recipient (employee email). Store returned document/signing link in Supabase and return signing URL to frontend.

4. **Frontend**  
   Same as Option A: employer “Send contract” (calls Edge Function with employee email + address); employee sees “Sign contract” and opens the signing URL. On return or via webhook (if Inkless supports it), update `employment_contracts.status` and `signed_at`.

**Summary:** Request free API key → create template in Inkless → Edge Function calls Inkless API → same Supabase table and frontend flows as DocuSign. No ongoing API cost.

---

## Recommended order for “easiest free”

1. **Use DocuSign sandbox first** (no email, no API key request, instant). Implement: Supabase table + one Edge Function (or minimal server) that gets a token and creates an envelope; frontend “Send contract” and “Sign contract” with redirect to update status.
2. **Later:** If you want free production, request an Inkless API key and swap the Edge Function to call Inkless instead of DocuSign; same table and UI.

---

## What you do *not* need

- No paid API plan.
- No DocuSign production account unless you later go live.
- No webhook for MVP: use redirect-after-sign to update status (or optional poll).
- No smart contract changes: e-sign is off-chain; onboarding stays as today (employer onboard after contract is signed).

---

## Files to add/change (high level)

| Item | Action |
|------|--------|
| `supabase/migrations/XXX_employment_contracts.sql` | New table `employment_contracts` |
| Supabase Edge Function (e.g. `create-envelope`) or small backend | Hold API key; create envelope; return signing URL |
| Frontend: Contracts page or Employer dashboard section | “Send contract” button; call Edge Function; show “Contract sent” / link for employee |
| Frontend: Employee view | List my contracts; “Sign” opens provider URL; redirect handler updates status |
| Env | `DOCUSIGN_INTEGRATION_KEY` (sandbox) or `INKLESS_API_KEY` (no keys in frontend) |

This keeps everything free (no API cost) and uses the easiest path: DocuSign sandbox first, Inkless as free production alternative.
