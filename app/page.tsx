"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { incomeSupabase, webplanSupabase } from "@/lib/supabaseClients";

type OrderRow = {
  id: string;
  customer_name: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  balance_due: number | null;
  payment_status: string | null;
  event_type: string | null;
  created_at: string | null;
  event_date: string | null;
  event_end_date: string | null;
};

type ExpenseRow = {
  order_id: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  expense_date: string | null;
};

type JobRow = {
  id: string;
  total_price: number | null;
  amount_paid: number | null;
  expense: number | null;
  payment_status: string | null;
  event_type: string | null;
  category: string | null;
  customer_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

const monthKey = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(d);
};

const knownExpenseBuckets = ["travel", "equipment", "editing", "marketing"];

const getDateAtStartOfDay = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseLocalDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("This Month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportView, setReportView] = useState<"monthly" | "yearly">("monthly");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [allJobs, setAllJobs] = useState<JobRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
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
        .select("id, customer_name, total_amount, amount_paid, balance_due, payment_status, event_type, created_at, event_date, event_end_date");
      const allOrdersQuery = webplanSupabase
        .from("orders")
        .select("id, customer_name, total_amount, amount_paid, balance_due, payment_status, event_type, created_at, event_date, event_end_date");

      let expensesQuery = webplanSupabase
        .from("expenses")
        .select("order_id, amount, category, description, expense_date");
      const allExpensesQuery = webplanSupabase
        .from("expenses")
        .select("order_id, amount, category, description, expense_date");

      let jobsQuery = incomeSupabase
        .from("jobs")
        .select("id, customer_name, total_price, amount_paid, expense, payment_status, event_type, category, start_date, end_date, is_deleted")
        .eq("is_deleted", false);
      const allJobsQuery = incomeSupabase
        .from("jobs")
        .select("id, customer_name, total_price, amount_paid, expense, payment_status, event_type, category, start_date, end_date, is_deleted")
        .eq("is_deleted", false);

      if (startDate) {
        ordersQuery = ordersQuery.gte("created_at", new Date(startDate).toISOString());
        expensesQuery = expensesQuery.gte("expense_date", startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("created_at", new Date(endDate).toISOString());
        expensesQuery = expensesQuery.lte("expense_date", endDate);
      }

      const [ordersRes, allOrdersRes, expensesRes, allExpensesRes, jobsRes, allJobsRes] = await Promise.all([
        ordersQuery,
        allOrdersQuery,
        expensesQuery,
        allExpensesQuery,
        jobsQuery,
        allJobsQuery,
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (allOrdersRes.error) throw allOrdersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (allExpensesRes.error) throw allExpensesRes.error;
      if (jobsRes.error) throw jobsRes.error;
      if (allJobsRes.error) throw allJobsRes.error;

      const allJobRows = (allJobsRes.data || []) as JobRow[];
      const filteredJobRows = allJobRows.filter((row) => {
        const jobDate = parseLocalDate(row.end_date || row.start_date);
        if (!jobDate) return false;
        if (startDate) {
          const start = parseLocalDate(startDate);
          if (start && jobDate < start) return false;
        }
        if (endDate) {
          const end = parseLocalDate(endDate);
          if (end && jobDate > end) return false;
        }
        return true;
      });

      setOrders((ordersRes.data || []) as OrderRow[]);
      setAllOrders((allOrdersRes.data || []) as OrderRow[]);
      setExpenses((expensesRes.data || []) as ExpenseRow[]);
      setAllExpenses((allExpensesRes.data || []) as ExpenseRow[]);
      setJobs(filteredJobRows);
      setAllJobs(allJobRows);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const orderReportSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredOrders = orders.filter((row) => {
      const eventEndDate = row.event_end_date
        ? getDateAtStartOfDay(row.event_end_date)
        : getDateAtStartOfDay(row.event_date);

      if (!eventEndDate || eventEndDate >= today) return false;

      const orderDate = getDateAtStartOfDay(row.event_date);
      if (!orderDate) return false;

      const start = startDate ? getDateAtStartOfDay(startDate) : null;
      const end = endDate ? getDateAtStartOfDay(endDate) : null;

      if (start && orderDate < start) return false;
      if (end && orderDate > end) return false;
      return true;
    });

    const completedOrderIds = new Set(filteredOrders.map((row) => row.id));
    const linkedExpenses = expenses.filter((row) => row.order_id && completedOrderIds.has(row.order_id));

    const totalRevenue = filteredOrders.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const totalReceived = filteredOrders.reduce((sum, row) => sum + (row.amount_paid || 0), 0);
    const totalPending = filteredOrders.reduce((sum, row) => sum + (row.balance_due || 0), 0);
    const totalExpense = linkedExpenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    const profit = totalRevenue - totalExpense;

    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      totalReceived,
      totalPending,
      totalExpense,
      profit,
    };
  }, [orders, expenses, startDate, endDate]);

  const allTimeOrderSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredOrders = allOrders.filter((row) => {
      const eventEndDate = row.event_end_date
        ? getDateAtStartOfDay(row.event_end_date)
        : getDateAtStartOfDay(row.event_date);

      return Boolean(eventEndDate && eventEndDate < today);
    });

    const completedOrderIds = new Set(filteredOrders.map((row) => row.id));
    const linkedExpenses = allExpenses.filter((row) => row.order_id && completedOrderIds.has(row.order_id));

    const totalRevenue = filteredOrders.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const totalReceived = filteredOrders.reduce((sum, row) => sum + (row.amount_paid || 0), 0);
    const totalPending = filteredOrders.reduce((sum, row) => sum + (row.balance_due || 0), 0);
    const totalExpense = linkedExpenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    const profit = totalRevenue - totalExpense;

    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      totalReceived,
      totalPending,
      totalExpense,
      profit,
    };
  }, [allOrders, allExpenses]);

  const jobReportSummary = useMemo(() => {
    const start = startDate ? getDateAtStartOfDay(startDate) : null;
    const end = endDate ? getDateAtStartOfDay(endDate) : null;

    const filteredJobs = jobs.filter((row) => {
      const jobDate = getDateAtStartOfDay(row.end_date || row.start_date);
      if (!jobDate) return false;
      if (start && jobDate < start) return false;
      if (end && jobDate > end) return false;
      return true;
    });

    const totalJobs = filteredJobs.length;
    const totalIncome = filteredJobs.reduce((sum, row) => sum + (row.total_price || 0), 0);
    const totalExpense = filteredJobs.reduce((sum, row) => sum + (row.expense || 0), 0);
    const totalReceived = filteredJobs.reduce((sum, row) => sum + (row.amount_paid || 0), 0);
    const totalPending = filteredJobs.reduce((sum, row) => sum + Math.max((row.total_price || 0) - (row.amount_paid || 0), 0), 0);
    const profit = totalIncome - totalExpense;

    return {
      totalJobs,
      totalIncome,
      totalExpense,
      totalReceived,
      totalPending,
      profit,
    };
  }, [jobs, startDate, endDate]);

  const allTimeJobSummary = useMemo(() => {
    const filteredJobs = allJobs.filter((row) => Boolean(getDateAtStartOfDay(row.end_date || row.start_date)));

    const totalJobs = filteredJobs.length;
    const totalIncome = filteredJobs.reduce((sum, row) => sum + (row.total_price || 0), 0);
    const totalExpense = filteredJobs.reduce((sum, row) => sum + (row.expense || 0), 0);
    const totalReceived = filteredJobs.reduce((sum, row) => sum + (row.amount_paid || 0), 0);
    const totalPending = filteredJobs.reduce((sum, row) => sum + Math.max((row.total_price || 0) - (row.amount_paid || 0), 0), 0);
    const profit = totalIncome - totalExpense;

    return {
      totalJobs,
      totalIncome,
      totalExpense,
      totalReceived,
      totalPending,
      profit,
    };
  }, [allJobs]);

  const summaryCards = useMemo(() => {
    const totalOrders = orderReportSummary.totalOrders;
    const totalJobs = jobReportSummary.totalJobs;
    const totalEvents = totalOrders + totalJobs;
    const orderIncome = orderReportSummary.totalRevenue;
    const jobIncome = jobReportSummary.totalIncome;
    const totalIncome = orderIncome + jobIncome;
    const totalReceived = orderReportSummary.totalReceived + jobReportSummary.totalReceived;
    const orderPending = orderReportSummary.totalPending;
    const jobPending = jobReportSummary.totalPending;
    const totalOutstanding = orderPending + jobPending;
    const webplanExpense = orderReportSummary.totalExpense;
    const jobExpense = jobReportSummary.totalExpense;
    const totalExpense = webplanExpense + jobExpense;
    const netProfit = orderReportSummary.profit + jobReportSummary.profit;

    return {
      totalOrders,
      totalJobs,
      totalEvents,
      orderIncome,
      jobIncome,
      totalIncome,
      totalReceived,
      orderPending,
      jobPending,
      totalOutstanding,
      webplanExpense,
      jobExpense,
      totalExpense,
      netProfit,
    };
  }, [orderReportSummary, jobReportSummary]);

  const profitSeries = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};

    orders.forEach((row) => {
      if (!row.created_at) return;
      const key = monthKey(row.created_at);
      if (!key) return;
      map[key] = map[key] || { income: 0, expense: 0 };
      map[key].income += row.total_amount || 0;
    });

    jobs.forEach((row) => {
      if (!row.start_date) return;
      const key = monthKey(row.start_date);
      if (!key) return;
      map[key] = map[key] || { income: 0, expense: 0 };
      map[key].income += row.total_price || 0;
      map[key].expense += row.expense || 0;
    });

    expenses.forEach((row) => {
      if (!row.expense_date) return;
      const key = monthKey(row.expense_date);
      if (!key) return;
      map[key] = map[key] || { income: 0, expense: 0 };
      map[key].expense += row.amount || 0;
    });

    const monthly = Object.keys(map)
      .sort()
      .map((key) => ({
        label: monthLabel(key),
        profit: map[key].income - map[key].expense,
        rawKey: key,
      }));

    if (reportView === "monthly") return monthly;

    const yearly: Record<string, number> = {};
    monthly.forEach((row) => {
      const year = row.rawKey.split("-")[0];
      yearly[year] = (yearly[year] || 0) + row.profit;
    });

    return Object.entries(yearly).map(([year, profit]) => ({ label: year, profit }));
  }, [orders, jobs, expenses, reportView]);

  const profitChartPath = useMemo(() => {
    const width = 320;
    const height = 120;
    const padding = 10;
    const points = profitSeries.map((row, idx) => {
      const x = padding + (idx / Math.max(profitSeries.length - 1, 1)) * (width - padding * 2);
      return { x, profit: row.profit };
    });
    const maxProfit = Math.max(...points.map((p) => p.profit), 1);
    const minProfit = Math.min(...points.map((p) => p.profit), 0);
    const range = Math.max(maxProfit - minProfit, 1);
    const scaled = points.map((p) => ({
      x: p.x,
      y: padding + ((maxProfit - p.profit) / range) * (height - padding * 2),
    }));
    const d = scaled
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    return { d, width, height };
  }, [profitSeries]);

  const expenseStacks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};

    expenses.forEach((row) => {
      if (!row.expense_date) return;
      const key = monthKey(row.expense_date);
      if (!key) return;
      const rawCategory = (row.category || "Other").toLowerCase();
      const bucket = knownExpenseBuckets.find((label) => rawCategory.includes(label)) || "Other";
      map[key] = map[key] || { Travel: 0, Equipment: 0, Editing: 0, Marketing: 0, Other: 0 };
      map[key][bucket.charAt(0).toUpperCase() + bucket.slice(1)] =
        (map[key][bucket.charAt(0).toUpperCase() + bucket.slice(1)] || 0) + (row.amount || 0);
    });

    return Object.keys(map)
      .sort()
      .map((key) => ({
        key,
        label: monthLabel(key),
        segments: [
          { label: "Travel", value: map[key].Travel || 0, color: "bg-sky-400" },
          { label: "Equipment", value: map[key].Equipment || 0, color: "bg-indigo-400" },
          { label: "Editing", value: map[key].Editing || 0, color: "bg-emerald-400" },
          { label: "Marketing", value: map[key].Marketing || 0, color: "bg-amber-400" },
          { label: "Other", value: map[key].Other || 0, color: "bg-slate-300" },
        ],
      }));
  }, [expenses]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">DASHBOARD OVERVIEW</p>
            <h2 className="text-3xl font-bold">Finance Dashboard</h2>
            <p className="text-sm text-[var(--muted)]">Live totals from orders, jobs, and expenses.</p>
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
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted)]">Report</label>
              <div className="inline-flex rounded-xl border border-[var(--line)] bg-white p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setReportView("monthly")}
                  className={`rounded-lg px-3 py-2 ${reportView === "monthly" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setReportView("yearly")}
                  className={`rounded-lg px-3 py-2 ${reportView === "yearly" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          {
            label: "Total Events",
            value: summaryCards.totalEvents,
            format: (val: number) => val.toString(),
            detail: `Orders: ${summaryCards.totalOrders} | Jobs: ${summaryCards.totalJobs}`,
          },
          {
            label: "Total Income",
            value: summaryCards.totalIncome,
            format: formatCurrency,
            detail: `Orders: ${formatCurrency(summaryCards.orderIncome)} | Jobs: ${formatCurrency(summaryCards.jobIncome)}`,
          },
          {
            label: "Amount Received",
            value: summaryCards.totalReceived,
            format: formatCurrency,
            detail: `Orders: ${formatCurrency(orderReportSummary.totalReceived)} | Jobs: ${formatCurrency(jobReportSummary.totalReceived)}`,
          },
          {
            label: "Outstanding Balance",
            value: summaryCards.totalOutstanding,
            format: formatCurrency,
            detail: `Orders: ${formatCurrency(summaryCards.orderPending)} | Jobs: ${formatCurrency(summaryCards.jobPending)}`,
          },
          {
            label: "Total Expense",
            value: summaryCards.totalExpense,
            format: formatCurrency,
            detail: `Webplan: ${formatCurrency(summaryCards.webplanExpense)} | Jobs: ${formatCurrency(summaryCards.jobExpense)}`,
          },
          {
            label: "Net Profit",
            value: summaryCards.netProfit,
            format: formatCurrency,
            detail: "Combined income minus total expense",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5">
            <p className="text-xs text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.format(card.value)}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
          <h3 className="text-lg font-semibold">Event Source Breakdown</h3>
          <p className="text-sm text-[var(--muted)]">See orders, jobs, and total event count together.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Orders", value: summaryCards.totalOrders.toString() },
              { label: "Jobs", value: summaryCards.totalJobs.toString() },
              { label: "Total", value: summaryCards.totalEvents.toString() },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
          <h3 className="text-lg font-semibold">Income Source Breakdown</h3>
          <p className="text-sm text-[var(--muted)]">See order value, job value, and combined total value.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Order Value", value: formatCurrency(summaryCards.orderIncome) },
              { label: "Job Value", value: formatCurrency(summaryCards.jobIncome) },
              { label: "Total Value", value: formatCurrency(summaryCards.totalIncome) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Balance Breakdown</h3>
        <p className="text-sm text-[var(--muted)]">Each source shows the selected period balance beside the all-time balance.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="pb-3 text-left">Source</th>
                <th className="pb-3 text-right">Current Balance</th>
                <th className="pb-3 text-right">Total Balance</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Orders",
                  current: formatCurrency(summaryCards.orderPending),
                  total: formatCurrency(allTimeOrderSummary.totalPending),
                },
                {
                  label: "Jobs",
                  current: formatCurrency(summaryCards.jobPending),
                  total: formatCurrency(allTimeJobSummary.totalPending),
                },
                {
                  label: "Combined",
                  current: formatCurrency(summaryCards.totalOutstanding),
                  total: formatCurrency(allTimeOrderSummary.totalPending + allTimeJobSummary.totalPending),
                },
              ].map((item) => (
                <tr key={item.label} className="border-t border-[var(--line)]">
                  <td className="py-3 font-semibold">{item.label}</td>
                  <td className="py-3 text-right">{item.current}</td>
                  <td className="py-3 text-right">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Webplan Report Summary</h3>
        <p className="text-sm text-[var(--muted)]">
          Orders use the same report logic as the webplan reports page: completed events only, filtered by event date.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Completed Orders", value: orderReportSummary.totalOrders.toString() },
            { label: "Total Revenue", value: formatCurrency(orderReportSummary.totalRevenue) },
            { label: "Amount Received", value: formatCurrency(orderReportSummary.totalReceived) },
            { label: "Total Expense", value: formatCurrency(orderReportSummary.totalExpense) },
            { label: "Profit", value: formatCurrency(orderReportSummary.profit) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-xs text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Pending amount: {formatCurrency(orderReportSummary.totalPending)}
        </p>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Job Report Summary</h3>
        <p className="text-sm text-[var(--muted)]">
          Jobs use the same report logic as the income reports page: filter by `end_date`, or `start_date` when no end date exists.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total Jobs", value: jobReportSummary.totalJobs.toString() },
            { label: "Total Income", value: formatCurrency(jobReportSummary.totalIncome) },
            { label: "Amount Received", value: formatCurrency(jobReportSummary.totalReceived) },
            { label: "Total Expense", value: formatCurrency(jobReportSummary.totalExpense) },
            { label: "Profit", value: formatCurrency(jobReportSummary.profit) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-xs text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Pending amount: {formatCurrency(jobReportSummary.totalPending)}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
          <h3 className="text-lg font-semibold">Profit Trend Report</h3>
          <p className="text-sm text-[var(--muted)]">Monthly profit trend based on income and expenses.</p>
          <div className="mt-6">
            <svg viewBox={`0 0 ${profitChartPath.width} ${profitChartPath.height}`} className="w-full">
              <path
                d={profitChartPath.d}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--muted)] sm:grid-cols-3">
              {profitSeries.map((row) => (
                <div key={row.label} className="rounded-xl border border-[var(--line)] px-3 py-2">
                  <p className="font-semibold text-[var(--text)]">{row.label}</p>
                  <p className={row.profit >= 0 ? "text-emerald-600" : "text-red-500"}>
                    {formatCurrency(row.profit)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
          <h3 className="text-lg font-semibold">Expense Analysis</h3>
          <p className="text-sm text-[var(--muted)]">Expense comparison per month by category.</p>
          <div className="mt-5 space-y-4">
            {expenseStacks.map((row) => {
              const total = row.segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
              return (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{row.label}</span>
                    <span className="text-[var(--muted)]">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full bg-[var(--line)]">
                    {row.segments.map((segment) => (
                      <div
                        key={segment.label}
                        className={`${segment.color}`}
                        style={{ width: `${(segment.value / total) * 100}%` }}
                        title={`${segment.label}: ${formatCurrency(segment.value)}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)] sm:grid-cols-5">
                    {row.segments.map((segment) => (
                      <div key={segment.label} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                        <span>{segment.label}</span>
                        <span>{formatCurrency(segment.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Reporting &amp; Downloads</h3>
        <p className="text-sm text-[var(--muted)]">Generate monthly or yearly reports and export files.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm">
            Download PDF Report
          </button>
          <button type="button" className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm">
            Download Excel Report
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Dashboard Features</h3>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {["responsive_dashboard", "date_filter", "monthly_report", "yearly_report", "download_pdf_report", "download_excel_report"].map(
            (feature) => (
              <span key={feature} className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--muted)]">
                {feature}
              </span>
            ),
          )}
        </div>
      </section>

      {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}
    </div>
  );
}
