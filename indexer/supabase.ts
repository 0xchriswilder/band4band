import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env from indexer directory so DocuSign keys are always found (avoids loading a different .env when cwd differs)
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
