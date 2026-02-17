import express from "express";
import cors from "cors";
import { supabase } from "./supabase";
import { startIndexerLoop } from "./indexer";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

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

/* ─── Start ─── */

app.listen(PORT, () => {
  console.log(`API running at PORT:${PORT}`);
  startIndexerLoop().catch((err) => console.error("Indexer crashed:", err));
});
