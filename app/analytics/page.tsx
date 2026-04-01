"use client";

import { useCallback, useEffect, useState } from "react";
import { incomeSupabase, webplanSupabase } from "@/lib/supabaseClients";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("This Month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [webplanOrders, setWebplanOrders] = useState(0);
  const [incomeJobs, setIncomeJobs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [webplanRevenue, setWebplanRevenue] = useState(0);
  const [incomeRevenue, setIncomeRevenue] = useState(0);

  const applyPeriod = useCallback((value: string) => {
    const now = new Date();
    let start = "";
    let end = "";

    if (value === "This Week") {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "Last Month") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      start = s.toISOString().split("T")[0];
      end = e.toISOString().split("T")[0];
    } else if (value === "This Month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "This Quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), quarter * 3, 1);
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "This Year") {
      const s = new Date(now.getFullYear(), 0, 1);
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "Last Year") {
      const s = new Date(now.getFullYear() - 1, 0, 1);
      const e = new Date(now.getFullYear() - 1, 11, 31);
      start = s.toISOString().split("T")[0];
      end = e.toISOString().split("T")[0];
    }

    setPeriod(value);
    if (value !== "Custom") {
      setStartDate(start);
      setEndDate(end);
    }
  }, []);

  useEffect(() => {
    applyPeriod("This Month");
  }, [applyPeriod]);

  useEffect(() => {
    const load = async () => {
      if (!webplanSupabase || !incomeSupabase) {
        setError("Supabase credentials missing. Update .env.local for both projects.");
        setLoading(false);
        return;
      }
      try {
        let ordersQuery = webplanSupabase.from("orders").select("id, total_amount, created_at");
        let jobsQuery = incomeSupabase.from("jobs").select("id, total_price, start_date, is_deleted").eq("is_deleted", false);

        if (startDate) {
          ordersQuery = ordersQuery.gte("created_at", new Date(startDate).toISOString());
          jobsQuery = jobsQuery.gte("start_date", startDate);
        }
        if (endDate) {
          ordersQuery = ordersQuery.lte("created_at", new Date(endDate).toISOString());
          jobsQuery = jobsQuery.lte("start_date", endDate);
        }

        const [ordersRes, jobsRes] = await Promise.all([ordersQuery, jobsQuery]);

        if (ordersRes.error) throw ordersRes.error;
        if (jobsRes.error) throw jobsRes.error;

        const orders = ordersRes.data || [];
        const jobs = jobsRes.data || [];

        setWebplanOrders(orders.length);
        setIncomeJobs(jobs.length);
        setWebplanRevenue(orders.reduce((s, o) => s + (o.total_amount || 0), 0));
        setIncomeRevenue(jobs.reduce((s, j) => s + (j.total_price || 0), 0));
      } catch {
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-[var(--muted)]">Volume and revenue trends across systems.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--muted)]">Webplan Orders</h3>
          <p className="mt-2 text-3xl font-bold">{webplanOrders}</p>
          <p className="text-sm text-[var(--muted)]">Revenue: {formatCurrency(webplanRevenue)}</p>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--muted)]">Income Jobs</h3>
          <p className="mt-2 text-3xl font-bold">{incomeJobs}</p>
          <p className="text-sm text-[var(--muted)]">Revenue: {formatCurrency(incomeRevenue)}</p>
        </div>
      </section>

      {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}
    </div>
  );
}
