# E-sign implementation plan (free, no API cost)

Use a **free** e-sign provider so no API key cost or subscription is needed. Two options:

---

## Option A: DocuSign sandbox (easiest to start)

- **Cost:** Free. No credit card.
- **Sign up:** [DocuSign Developer Sandbox](https://go.docusign.com/sandbox/productshot/) — name, email, country. Instant access.
- **Limitation:** Sandbox only (demo/test). For production you’d switch to a paid plan or Option B.
- **Best for:** Bounty demo and quick integration.

### DocuSign console checklist (do this before implementing)

You already have the **Integration Key**. In the same app's settings page, complete:

| Step | Where | What to do |
|------|--------|------------|
| 1. Secret Key | **Secret Keys** | Click **"+ Add Secret Key"**. Copy the secret immediately (it's shown only once). Store it in `.env` as `DOCUSIGN_SECRET_KEY`. |
| 2. Redirect URI | **Redirect URIs** | Click **"+ Add URI"**. Add: `http://localhost:5173/docusign/callback` (Vite default). For production later, add your deployed URL. |
| 3. CORS | **CORS Configuration → Origin URLs** | Click **"+ Add Origin URL"**. Add: `http://localhost:5173`. |
| 4. HTTP methods | **Allowed HTTP Methods** | Enable at least **GET** and **POST**. |
| 5. Integration type | **Integration Type** | For sandbox, **Private custom integration** is fine. |

You do **not** need RSA Keypairs when using **Authorization Code Grant**. RSA is only for JWT Grant.

After steps 1–3 (and saving), you have everything to implement: Integration Key + Secret Key + Redirect URI + CORS.

**Steps (implementation):**

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

**Important:** Keep `DOCUSIGN_SECRET_KEY` only in the **indexer** `.env`. Do not put it in the frontend `.env` (it would be exposed in the bundle). The frontend only needs `VITE_INDEXER_URL` (e.g. `http://localhost:4000`) to call the indexer API.

---

## Who sends the email / Enterprise (big companies)

- **Sandbox:** When an employer clicks “Connect DocuSign”, they connect **their own** DocuSign sandbox account (OAuth). Contract emails are sent **from that account** — so the “from” address is the employer’s DocuSign sandbox, not a shared “developer” account.
- **Production / big companies:** The app does **not** use one shared DocuSign account. Each employer connects **their own** DocuSign (sandbox or production) via OAuth. So a company that already has DocuSign would simply connect their existing DocuSign account in the app; envelopes and emails then use **their** account and branding. The integration is “bring your own DocuSign”, not “use our DocuSign”.

---

## Contract content: generic vs your own DocuSign templates

- **Current behavior:** The app sends a **generic** Employment Agreement that is generated in code (HTML converted to PDF in the indexer). The employee sees a short, standard demo document — you do **not** choose a contract from your DocuSign account or from your email before sending. In sandbox/demo, the DocuSign UI will show “DEMONSTRATION DOCUMENT ONLY” and the text we built in.
- **Seeing your own contracts before sending:** The app does **not** yet read or list contracts you have in DocuSign (e.g. templates, or documents in your DocuSign inbox). So you cannot “pick which contract the employee must sign” from your DocuSign library inside the app.
- **Using your own templates (future):** If you already have contracts or templates in DocuSign (as a company or from your email), you can create a **template** in the DocuSign dashboard (sandbox or production): upload your PDF, add a signer role (e.g. “Employee”), save, and copy the **Template ID**. The app could then be extended to accept a Template ID (e.g. in env or in the UI), and the indexer would create envelopes from that template instead of the generic document. The employee would then see and sign **your** contract. Until that is implemented, all sent contracts use the built-in generic text.

---

## Production deployment (Netlify + Railway)

When the app is deployed (e.g. frontend at **https://fhecpayroll.netlify.app**, indexer on **Railway**), set the following.

### 1. DocuSign app settings (production)

In your DocuSign app (Apps and Keys), add production URIs:

| Setting | Value |
|--------|--------|
| **Redirect URI** | `https://fhecpayroll.netlify.app/docusign/callback` |
| **CORS → Origin URL** | `https://fhecpayroll.netlify.app` |
| **Allowed HTTP methods** | GET, POST |

Use the same Integration Key and Secret; for go-live you may need to complete DocuSign’s go-live process and switch to production base URLs.

### 2. Frontend (Netlify)

In Netlify **Environment variables** (or build env):

- `VITE_INDEXER_URL` = your Railway indexer URL, e.g. `https://your-indexer.up.railway.app` (no trailing slash).

Rebuild and deploy so the frontend calls the indexer at that URL.

### 3. Indexer (Railway)

In Railway **Variables** for the indexer service:

- `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY` (same as local/sandbox or production keys).
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RPC_URL`, `PAYROLL_FACTORY_ADDRESS`, etc.

No change to redirect logic: the frontend sends `return_url: window.location.origin + '/docusign/signed'`, so in production that becomes `https://fhecpayroll.netlify.app/docusign/signed`. After the employee signs, DocuSign redirects there with `?envelope_id=...`, and the page calls the indexer’s `mark-signed` API so Supabase is updated and the employer sees “Signed.”

### 4. Summary

- **DocuSign Redirect URI:** `https://fhecpayroll.netlify.app/docusign/callback`
- **DocuSign CORS origin:** `https://fhecpayroll.netlify.app`
- **Frontend env:** `VITE_INDEXER_URL=https://your-railway-indexer-url`
- **Return URL** (after sign): `https://fhecpayroll.netlify.app/docusign/signed` (envelope_id is appended by the indexer when creating the signing URL).

---

## Files to add/change (high level)

| Item | Action |
|------|--------|
| `supabase/migrations/XXX_employment_contracts.sql` | New table `employment_contracts` |
| Supabase Edge Function (e.g. `create-envelope`) or small backend | Hold API key; create envelope; return signing URL |
| Frontend: Contracts page or Employer dashboard section | “Send contract” button; call Edge Function; show “Contract sent” / link for employee |
| Frontend: Employee view | List my contracts; “Sign” opens provider URL; redirect handler updates status |
| **Indexer .env** | `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY` (from DocuSign app settings). Do not put the secret in the frontend. |
| **Frontend .env** | `VITE_INDEXER_URL=http://localhost:4000` (or your indexer URL) so the app can call the indexer API. |

This keeps everything free (no API cost) and uses the easiest path: DocuSign sandbox first, Inkless as free production alternative.
