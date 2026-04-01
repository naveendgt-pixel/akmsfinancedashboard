"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { incomeSupabase, webplanSupabase } from "@/lib/supabaseClients";

type ReportRow = {
  id: string;
  source: "Webplan" | "Income";
  title: string;
  date: string;
  amount: number;
};

type OrderEfficiencyRow = {
  id: string;
  customer_name: string | null;
  event_date: string | null;
  order_completed_date: string | null;
};

type JobEfficiencyRow = {
  id: string;
  studio_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

const formatActivityDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};

const formatPrettyDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};

const parseLocalDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getDateAtStartOfDay = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [orderRows, setOrderRows] = useState<OrderEfficiencyRow[]>([]);
  const [jobRows, setJobRows] = useState<JobEfficiencyRow[]>([]);
  const [period, setPeriod] = useState("This Month");
  const [efficiencyFilter, setEfficiencyFilter] = useState<"all" | "orders" | "jobs">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + r.amount, 0), [rows]);

  const applyPeriod = useCallback((value: string) => {
    const now = new Date();
    let start = "";
    let end = "";

    if (value === "Today") {
      start = now.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "Yesterday") {
      const s = new Date(now);
      s.setDate(now.getDate() - 1);
      start = s.toISOString().split("T")[0];
      end = s.toISOString().split("T")[0];
    } else if (value === "This Week") {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "Last 7 Days") {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      start = s.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (value === "Last 30 Days") {
      const s = new Date(now);
      s.setDate(now.getDate() - 30);
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
    } else if (value === "All") {
      start = "";
      end = "";
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

  const handleDownloadPdf = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Finance Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1b1b1b; }
    h1 { font-size: 18px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 8px; font-size: 12px; }
    th { background: #f5f5f5; }
    .right { text-align: right; }
  </style>
</head>
<body>
  <h1>Finance Report</h1>
  <div>Total: ${formatCurrency(totalAmount)}</div>
  <table>
    <thead>
      <tr>
        <th>Source</th>
        <th>Title</th>
        <th>Date</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr>
          <td>${row.source}</td>
          <td>${row.title}</td>
          <td>${row.date ? formatActivityDate(row.date) : ""}</td>
          <td class="right">${formatCurrency(row.amount)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  useEffect(() => {
    const load = async () => {
      if (!webplanSupabase || !incomeSupabase) {
        setError("Supabase credentials missing. Update .env.local for both projects.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let ordersQuery = webplanSupabase
          .from("orders")
          .select("id, order_number, customer_name, created_at, total_amount, event_date, event_end_date")
          .order("created_at", { ascending: false });

        const efficiencyOrdersQuery = webplanSupabase
          .from("orders")
          .select("id, customer_name, event_date, order_completed_date");

        const jobsQuery = incomeSupabase
          .from("jobs")
          .select("id, customer_name, start_date, end_date, total_price, is_deleted")
          .eq("is_deleted", false)
          .order("start_date", { ascending: false });

        const efficiencyJobsQuery = incomeSupabase
          .from("jobs")
          .select("id, studio_name, start_date, end_date, is_deleted")
          .eq("is_deleted", false);

        if (startDate) {
          ordersQuery = ordersQuery.gte("created_at", new Date(startDate).toISOString());
        }
        if (endDate) {
          ordersQuery = ordersQuery.lte("created_at", new Date(endDate).toISOString());
        }

        const [ordersRes, efficiencyOrdersRes, jobsRes, efficiencyJobsRes] = await Promise.all([
          ordersQuery.limit(10),
          efficiencyOrdersQuery,
          jobsQuery.limit(10),
          efficiencyJobsQuery,
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (efficiencyOrdersRes.error) throw efficiencyOrdersRes.error;
        if (jobsRes.error) throw jobsRes.error;
        if (efficiencyJobsRes.error) throw efficiencyJobsRes.error;

        const orderRows = (ordersRes.data || []).map((o) => ({
          id: o.id,
          source: "Webplan" as const,
          title: `Order ${o.order_number}`,
          date: o.created_at || "",
          amount: o.total_amount || 0,
        }));

        const incomeRows = (jobsRes.data || []).map((j) => ({
          id: j.id,
          source: "Income" as const,
          title: j.customer_name ? `Job for ${j.customer_name}` : "Job",
          date: j.start_date || "",
          amount: j.total_price || 0,
        }));

        const merged = [...orderRows, ...incomeRows].sort((a, b) => (a.date > b.date ? -1 : 1));
        setRows(merged);

        const filteredOrderEfficiencyRows = ((efficiencyOrdersRes.data || []) as OrderEfficiencyRow[]).filter((row) => {
          const start = startDate ? getDateAtStartOfDay(startDate) : null;
          const end = endDate ? getDateAtStartOfDay(endDate) : null;
          const completionDate = getDateAtStartOfDay(row.order_completed_date);
          if (!completionDate) return false;
          if (start && completionDate < start) return false;
          if (end && completionDate > end) return false;
          return true;
        });

        const filteredJobEfficiencyRows = ((efficiencyJobsRes.data || []) as JobEfficiencyRow[]).filter((row) => {
          const start = startDate ? parseLocalDate(startDate) : null;
          const end = endDate ? parseLocalDate(endDate) : null;
          const effectiveDate = parseLocalDate(row.end_date || row.start_date);
          if (!effectiveDate) return false;
          if (start && effectiveDate < start) return false;
          if (end && effectiveDate > end) return false;
          return true;
        });

        setOrderRows(filteredOrderEfficiencyRows);
        setJobRows(filteredJobEfficiencyRows);
      } catch {
        setError("Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [startDate, endDate]);

  const efficiencyReport = useMemo(() => {
    const computedOrdersBase = orderRows
      .map((row) => {
        const start = getDateAtStartOfDay(row.event_date);
        const completion = getDateAtStartOfDay(row.order_completed_date);
        if (!start || !completion) return null;
        return {
          id: row.id,
          clientName: row.customer_name || "Unknown Client",
          startDate: row.event_date,
          completionDate: row.order_completed_date,
          totalDays: Math.max(Math.round((completion.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 0),
        };
      })
      .filter(
        (row): row is { id: string; clientName: string; startDate: string | null; completionDate: string | null; totalDays: number } =>
          Boolean(row),
      );

    const computedJobsBase = jobRows
      .map((row) => {
        const start = getDateAtStartOfDay(row.start_date);
        const end = getDateAtStartOfDay(row.end_date);
        if (!start || !end) return null;
        return {
          studioName: row.studio_name || "Not Available",
          startDate: row.start_date,
          endDate: row.end_date,
          totalDays: Math.max(Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 0),
        };
      })
      .filter(
        (row): row is { studioName: string; startDate: string | null; endDate: string | null; totalDays: number } =>
          Boolean(row),
      );

    const fastestOrderDays = computedOrdersBase.length
      ? Math.min(...computedOrdersBase.map((row) => (row.totalDays === 0 ? 1 : row.totalDays)))
      : 1;
    const fastestJobDays = computedJobsBase.length
      ? Math.min(...computedJobsBase.map((row) => (row.totalDays === 0 ? 1 : row.totalDays)))
      : 1;

    const computedOrders = computedOrdersBase.map((row) => ({
      ...row,
      efficiencyPercent: row.totalDays === 0 ? 100 : Math.min((fastestOrderDays / row.totalDays) * 100, 100),
    }));

    const computedJobs = computedJobsBase.map((row) => ({
      ...row,
      efficiencyPercent: row.totalDays === 0 ? 100 : Math.min((fastestJobDays / row.totalDays) * 100, 100),
    }));

    const allDays = [...computedOrders.map((row) => row.totalDays), ...computedJobs.map((row) => row.totalDays)];
    const averageOrderEfficiency = computedOrders.length
      ? computedOrders.reduce((sum, row) => sum + row.efficiencyPercent, 0) / computedOrders.length
      : 0;
    const averageJobEfficiency = computedJobs.length
      ? computedJobs.reduce((sum, row) => sum + row.efficiencyPercent, 0) / computedJobs.length
      : 0;

    return {
      averageCompletionTime: allDays.length ? allDays.reduce((sum, day) => sum + day, 0) / allDays.length : 0,
      fastestCompletion: allDays.length ? Math.min(...allDays) : 0,
      slowestCompletion: allDays.length ? Math.max(...allDays) : 0,
      averageOrderEfficiency,
      averageJobEfficiency,
      orderRows: computedOrders,
      jobRows: computedJobs,
    };
  }, [orderRows, jobRows]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-sm text-[var(--muted)]">Recent activity and efficiency tracking across both systems.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted)]">Period</label>
              <select
                value={period}
                onChange={(e) => applyPeriod(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Quarter">This Quarter</option>
                <option value="This Year">This Year</option>
                <option value="Last Year">Last Year</option>
                <option value="All">All</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted)]">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={period !== "Custom"}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted)]">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={period !== "Custom"}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <span>Total: {formatCurrency(totalAmount)}</span>
            <button
              onClick={handleDownloadPdf}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--accent)]"
            >
              Download PDF
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="text-xs text-[var(--muted)]">{row.source}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(row.amount)}</p>
                <p className="text-xs text-[var(--muted)]">{row.date ? formatActivityDate(row.date) : ""}</p>
              </div>
            </div>
          ))}
        </div>
        {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>}
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Efficiency Report</h3>
        <p className="text-sm text-[var(--muted)]">Completion time in days for orders and job orders in the selected period. Orders use `event_date` as the start date and `order_completed_date` as the completion date. The fastest record in each table is treated as 100% efficient.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: "all", label: "All" },
            { value: "orders", label: "Orders" },
            { value: "jobs", label: "Jobs" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setEfficiencyFilter(item.value as "all" | "orders" | "jobs")}
              className={`rounded-full border px-4 py-2 text-sm ${
                efficiencyFilter === item.value
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Average Completion Time", value: `${efficiencyReport.averageCompletionTime.toFixed(1)} days` },
            { label: "Fastest Completion", value: `${efficiencyReport.fastestCompletion} days` },
            { label: "Slowest Completion", value: `${efficiencyReport.slowestCompletion} days` },
            { label: "Order Efficiency", value: `${efficiencyReport.averageOrderEfficiency.toFixed(1)}%` },
            { label: "Job Efficiency", value: `${efficiencyReport.averageJobEfficiency.toFixed(1)}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-xs text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(efficiencyFilter === "all" || efficiencyFilter === "orders") && (
          <div>
            <h4 className="text-base font-semibold">Orders Efficiency</h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="pb-3 text-left">Customer Name</th>
                    <th className="pb-3 text-left">Start Date</th>
                    <th className="pb-3 text-left">Completion Date</th>
                    <th className="pb-3 text-right">Days</th>
                    <th className="pb-3 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {efficiencyReport.orderRows.map((row, index) => (
                    <tr key={`${row.clientName}-${index}`} className="border-t border-[var(--line)]">
                      <td className="py-3">{row.clientName}</td>
                      <td className="py-3">{formatPrettyDate(row.startDate)}</td>
                      <td className="py-3">{formatPrettyDate(row.completionDate)}</td>
                      <td className="py-3 text-right">{row.totalDays}</td>
                      <td className="py-3 text-right">{row.efficiencyPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
          {(efficiencyFilter === "all" || efficiencyFilter === "jobs") && (
          <div>
            <h4 className="text-base font-semibold">Jobs Efficiency</h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="pb-3 text-left">Studio Name</th>
                    <th className="pb-3 text-left">Start Date</th>
                    <th className="pb-3 text-left">End Date</th>
                    <th className="pb-3 text-right">Days</th>
                    <th className="pb-3 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {efficiencyReport.jobRows.map((row, index) => (
                    <tr key={`${row.studioName}-${index}`} className="border-t border-[var(--line)]">
                      <td className="py-3">{row.studioName}</td>
                      <td className="py-3">{formatPrettyDate(row.startDate)}</td>
                      <td className="py-3">{formatPrettyDate(row.endDate)}</td>
                      <td className="py-3 text-right">{row.totalDays}</td>
                      <td className="py-3 text-right">{row.efficiencyPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
