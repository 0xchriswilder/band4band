import express from "express";
import cors from "cors";
import { supabase } from "./supabase";
import { startIndexerLoop } from "./indexer";
import {
  exchangeCodeForTokens,
  getUserInfo,
  getAccessTokenFromRefresh,
  createEnvelope,
  createRecipientView,
  getAuthUrl,
  getEnvelopeStatus,
} from "./docusign";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const DOCUSIGN_IK = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_SECRET = process.env.DOCUSIGN_SECRET_KEY;

app.use(cors());
app.use(express.json());

/* ─── Health ─── */

app.get("/ping", (_, res) => {
  console.log("Ping received — keeping service awake");
  res.send("pong");
});

app.get("/api/test", (_req, res) => {
  res.json({ status: "ok" });
});

/* ─── Employees ─── */

app.get("/api/employees", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const employer = (req.query.employer as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("employees")
      .select("*", { count: "exact" })
      .eq("whitelisted", true)
      .order("added_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (employer) {
      query = query.eq("employer", employer.toLowerCase());
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data: data ?? [],
      pagination: {
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("[ERROR] Fetching employees:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/employees/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { data, error } = await supabase
      .from("employees")
      .select("address, whitelisted, encrypted_salary")
      .eq("address", address)
      .single();

    if (error || !data) {
      return res.json({ whitelisted: false });
    }

    res.json({
      whitelisted: data.whitelisted,
      address: data.address,
      encryptedSalary: data.encrypted_salary,
    });
  } catch (err: any) {
    console.error("Error checking whitelist:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── Payment History ─── */

app.get("/api/history/:employee", async (req, res) => {
  try {
    const { employee } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from("salary_payments")
      .select("*", { count: "exact" })
      .eq("employee", employee.toLowerCase())
      .order("block_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      page,
      limit,
      total: count ?? 0,
      data: data ?? [],
    });
  } catch (err: any) {
    console.error("[ERROR] Fetching history:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── Employer Payment History ─── */

app.get("/api/employer-history/:employer", async (req, res) => {
  try {
    const { employer } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from("salary_payments")
      .select("*", { count: "exact" })
      .eq("employer", employer.toLowerCase())
      .order("block_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      page,
      limit,
      total: count ?? 0,
      data: data ?? [],
    });
  } catch (err: any) {
    console.error("[ERROR] Fetching employer history:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── Payrolls ─── */

app.get("/api/payrolls", async (req, res) => {
  try {
    const creator = (req.query.creator as string) || "";

    let query = supabase
      .from("payrolls")
      .select("*")
      .order("created_at", { ascending: false });

    if (creator) {
      query = query.eq("creator", creator.toLowerCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data: data ?? [] });
  } catch (err: any) {
    console.error("[ERROR] Fetching payrolls:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DocuSign e-sign ─── */

app.get("/api/docusign/status", async (req, res) => {
  const employer = (req.query.employer_address as string)?.toLowerCase();
  if (!employer) return res.status(400).json({ error: "Missing employer_address" });
  const { data } = await supabase
    .from("employer_docusign_tokens")
    .select("employer_address")
    .eq("employer_address", employer)
    .single();
  res.json({ connected: !!data });
});

app.get("/api/docusign/auth-url", (req, res) => {
  const redirectUri = (req.query.redirect_uri as string)?.trim() || "";
  const state = (req.query.state as string)?.trim() || "";
  if (!DOCUSIGN_IK) {
    return res.status(500).json({
      error: "DocuSign Integration Key not set. Add DOCUSIGN_INTEGRATION_KEY to indexer/.env and restart the indexer.",
    });
  }
  if (!redirectUri) {
    return res.status(400).json({ error: "Missing redirect_uri query parameter" });
  }
  if (!state) {
    return res.status(400).json({ error: "Missing state query parameter" });
  }
  const url = getAuthUrl(DOCUSIGN_IK, redirectUri, state);
  res.json({ url });
});

app.post("/api/docusign/exchange-code", async (req, res) => {
  if (!DOCUSIGN_IK || !DOCUSIGN_SECRET) {
    return res.status(500).json({ error: "DocuSign not configured" });
  }
  const { code, redirect_uri, state } = req.body as { code?: string; redirect_uri?: string; state?: string };
  if (!code || !redirect_uri || !state) {
    return res.status(400).json({ error: "Missing code, redirect_uri, or state" });
  }
  try {
    const tokens = await exchangeCodeForTokens(DOCUSIGN_IK, DOCUSIGN_SECRET, code, redirect_uri);
    const userInfo = await getUserInfo(tokens.access_token);
    const employerAddress = (state || "").toLowerCase();
    const { error } = await supabase.from("employer_docusign_tokens").upsert(
      {
        employer_address: employerAddress,
        refresh_token: tokens.refresh_token,
        account_id: userInfo.account_id,
        base_uri: userInfo.base_uri,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employer_address" }
    );
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[DocuSign] exchange-code:", err.message);
    res.status(500).json({ error: err.message || "Token exchange failed" });
  }
});

app.post("/api/docusign/create-envelope", async (req, res) => {
  if (!DOCUSIGN_IK || !DOCUSIGN_SECRET) {
    return res.status(500).json({ error: "DocuSign not configured" });
  }
  const {
    employer_address,
    employee_email,
    employee_address,
    employee_name,
    payroll_address,
    return_url,
  } = req.body as {
    employer_address?: string;
    employee_email?: string;
    employee_address?: string;
    employee_name?: string;
    payroll_address?: string;
    return_url?: string;
  };
  if (!employer_address || !employee_email || !employee_address) {
    return res.status(400).json({ error: "Missing employer_address, employee_email, or employee_address" });
  }
  const empAddr = employer_address.toLowerCase();
  const { data: row } = await supabase
    .from("employer_docusign_tokens")
    .select("refresh_token, account_id, base_uri")
    .eq("employer_address", empAddr)
    .single();
  if (!row) {
    return res.status(400).json({ error: "Connect DocuSign first (use Connect DocuSign in Employer)" });
  }
  try {
    const accessToken = await getAccessTokenFromRefresh(DOCUSIGN_IK, DOCUSIGN_SECRET, row.refresh_token);
    const baseUri = row.base_uri || "https://demo.docusign.net";
    const signingReturnUrl = return_url || `${req.protocol}://${req.get("host") || "localhost:4000"}/docusign/signed`;
    const { envelopeId, signingUrl } = await createEnvelope(
      baseUri,
      row.account_id,
      accessToken,
      employee_email,
      employee_name || employee_email,
      signingReturnUrl
    );
    const { error } = await supabase.from("employment_contracts").insert({
      payroll_address: (payroll_address || "").toLowerCase(),
      employee_address: employee_address.toLowerCase(),
      employee_email: employee_email || "",
      employer_address: empAddr,
      envelope_id: envelopeId,
      status: "sent",
    });
    if (error) throw error;
    res.json({ envelopeId, signingUrl });
  } catch (err: any) {
    console.error("[DocuSign] create-envelope:", err.message);
    res.status(500).json({ error: err.message || "Create envelope failed" });
  }
});

app.post("/api/docusign/recipient-view", async (req, res) => {
  if (!DOCUSIGN_IK || !DOCUSIGN_SECRET) {
    return res.status(500).json({ error: "DocuSign not configured" });
  }
  const { envelope_id, employee_address, return_url } = req.body as {
    envelope_id?: string;
    employee_address?: string;
    return_url?: string;
  };
  if (!envelope_id || !employee_address) {
    return res.status(400).json({ error: "Missing envelope_id or employee_address" });
  }
  const { data: contract } = await supabase
    .from("employment_contracts")
    .select("employer_address, employee_email")
    .eq("envelope_id", envelope_id)
    .eq("employee_address", employee_address.toLowerCase())
    .single();
  if (!contract) {
    return res.status(404).json({ error: "Contract not found" });
  }
  const employeeEmail = (contract.employee_email || "").trim();
  if (!employeeEmail) {
    return res.status(400).json({
      error: "This contract has no email on file. Ask your employer to re-send the contract with your email in your profile.",
    });
  }
  const { data: tokenRow } = await supabase
    .from("employer_docusign_tokens")
    .select("refresh_token, account_id, base_uri")
    .eq("employer_address", contract.employer_address)
    .single();
  if (!tokenRow) {
    return res.status(400).json({ error: "Employer DocuSign token missing" });
  }
  try {
    const accessToken = await getAccessTokenFromRefresh(DOCUSIGN_IK, DOCUSIGN_SECRET, tokenRow.refresh_token);
    const url = await createRecipientView(
      tokenRow.base_uri || "https://demo.docusign.net",
      tokenRow.account_id,
      accessToken,
      envelope_id,
      employeeEmail,
      "",
      return_url || ""
    );
    res.json({ url });
  } catch (err: any) {
    console.error("[DocuSign] recipient-view:", err.message);
    res.status(500).json({ error: err.message || "Recipient view failed" });
  }
});

app.post("/api/docusign/mark-signed", async (req, res) => {
  if (!DOCUSIGN_IK || !DOCUSIGN_SECRET) {
    return res.status(500).json({ error: "DocuSign not configured" });
  }
  const { envelope_id } = req.body as { envelope_id?: string };
  if (!envelope_id) {
    return res.status(400).json({ error: "Missing envelope_id" });
  }
  const { data: contract } = await supabase
    .from("employment_contracts")
    .select("employer_address, status")
    .eq("envelope_id", envelope_id)
    .single();
  if (!contract) {
    return res.status(404).json({ error: "Contract not found" });
  }
  if (contract.status === "signed") {
    return res.json({ ok: true, already: true });
  }
  const { data: tokenRow } = await supabase
    .from("employer_docusign_tokens")
    .select("refresh_token, account_id, base_uri")
    .eq("employer_address", contract.employer_address)
    .single();
  if (!tokenRow) {
    return res.status(400).json({ error: "Employer DocuSign token missing" });
  }
  try {
    const accessToken = await getAccessTokenFromRefresh(DOCUSIGN_IK, DOCUSIGN_SECRET, tokenRow.refresh_token);
    const baseUri = tokenRow.base_uri || "https://demo.docusign.net";
    const status = await getEnvelopeStatus(baseUri, tokenRow.account_id, accessToken, envelope_id);
    if (status.toLowerCase() === "completed") {
      const { error } = await supabase
        .from("employment_contracts")
        .update({ status: "signed", signed_at: new Date().toISOString() })
        .eq("envelope_id", envelope_id);
      if (error) throw error;
    }
    res.json({ ok: true, status });
  } catch (err: any) {
    console.error("[DocuSign] mark-signed:", err.message);
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

app.get("/api/docusign/contracts", async (req, res) => {
  const by = req.query.by as string; // "employee" | "employer"
  const address = (req.query.address as string)?.toLowerCase();
  if (!by || !address) {
    return res.status(400).json({ error: "Missing by (employee|employer) or address" });
  }
  const col = by === "employee" ? "employee_address" : "employer_address";
  const { data, error } = await supabase
    .from("employment_contracts")
    .select("*")
    .eq(col, address)
    .order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ data: data ?? [] });
});

/* ─── Start ─── */

app.listen(PORT, () => {
  console.log(`API running at PORT:${PORT}`);
  if (!DOCUSIGN_IK || !DOCUSIGN_SECRET) {
    console.warn("DocuSign: DOCUSIGN_INTEGRATION_KEY or DOCUSIGN_SECRET_KEY missing in .env — Contracts (e-sign) will return errors until set.");
  }
  startIndexerLoop().catch((err) => console.error("Indexer crashed:", err));
});
