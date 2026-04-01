import { createClient, SupabaseClient } from "@supabase/supabase-js";

const webplanUrl = process.env.NEXT_PUBLIC_WEBPLAN_SUPABASE_URL || "";
const webplanKey = process.env.NEXT_PUBLIC_WEBPLAN_SUPABASE_ANON_KEY || "";
const incomeUrl = process.env.NEXT_PUBLIC_INCOME_SUPABASE_URL || "";
const incomeKey = process.env.NEXT_PUBLIC_INCOME_SUPABASE_ANON_KEY || "";

const makeClient = (url: string, key: string): SupabaseClient | null => {
  if (!url || !key) return null;
  return createClient(url, key);
};

export const webplanSupabase = makeClient(webplanUrl, webplanKey);
export const incomeSupabase = makeClient(incomeUrl, incomeKey);
