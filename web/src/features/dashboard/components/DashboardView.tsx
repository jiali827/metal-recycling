"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  ArrowDownLeft,
  CurrencyCircleDollar,
  Scales,
  TrendUp,
} from "@phosphor-icons/react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatCard } from "@/shared/ui/StatCard";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { DateRangePicker, SegmentedControl } from "@/shared/ui/CrudUi";
import { DashReveal } from "@/shared/lib/dashboard-motion";
import {
  DIRECTION_PURCHASE_COLOR,
  DIRECTION_SALE_COLOR,
} from "@/shared/lib/direction-colors";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { isMiscPayment, isSalaryPayment } from "@/entities/payment/meta";
import type { WeighTicket } from "@/entities/types";
import {
  addDays,
  eachDayKeys,
  endOfMonthDate,
  endOfWeekMon,
  formatIso,
  inDateRange,
  parseDate,
  pctChange,
  seededUnit,
  shiftYears,
  startOfLocalToday,
  startOfMonthDate,
  startOfWeekMon,
  toDateKey,
} from "../lib/date-range";
import { LineChart, MaterialPieChart, aggregateMaterialStats } from "./charts";
import {
  CashGlance,
  CustomerTopList,
  SectionCard,
  SettleOverview,
} from "./widgets";

type RangePreset = "today" | "week" | "month" | "custom";

export default function DashboardView() {
  const { t } = useI18n();
  const {
    weighTickets,
    receivables,
    payables,
    payments,
    tenant,
  } = useMockStore();

  const [preset, setPreset] = useState<RangePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [materialMetric, setMaterialMetric] = useState<"amount" | "weight">(
    "amount",
  );

  /** 演示：以业务数据最晚日期为「今日」锚点，避免真实日历与种子数据错位导致空白 */
  const anchorDate = useMemo(() => {
    const keys = [
      ...weighTickets.map((row) => toDateKey(row.date)),
      ...payments.map((row) => toDateKey(row.date)),
    ]
      .filter(Boolean)
      .sort();
    return keys.length ? parseDate(keys[keys.length - 1]) : startOfLocalToday();
  }, [weighTickets, payments]);

  const range = useMemo(() => {
    if (preset === "today") {
      const key = formatIso(anchorDate);
      return { start: key, end: key };
    }
    if (preset === "week") {
      return {
        start: formatIso(startOfWeekMon(anchorDate)),
        end: formatIso(endOfWeekMon(anchorDate)),
      };
    }
    if (preset === "month") {
      return {
        start: formatIso(startOfMonthDate(anchorDate)),
        end: formatIso(endOfMonthDate(anchorDate)),
      };
    }
    let start = customStart || formatIso(addDays(anchorDate, -6));
    let end = customEnd || formatIso(anchorDate);
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    return { start, end };
  }, [preset, customStart, customEnd, anchorDate]);

  const rangeOptions = useMemo(
    () => [
      { value: "custom", label: t("dashboard.rangeCustom") },
      { value: "today", label: t("dashboard.rangeToday") },
      { value: "week", label: t("dashboard.rangeWeek") },
      { value: "month", label: t("dashboard.rangeMonth") },
    ],
    [t],
  );

  function handlePresetChange(next: string) {
    const value = next as RangePreset;
    if (value === "custom") {
      setCustomStart((prev) => prev || range.start);
      setCustomEnd((prev) => prev || range.end);
    }
    setPreset(value);
  }

  function handleRangeChange(start: string, end: string) {
    setCustomStart(start);
    setCustomEnd(end);
    setPreset("custom");
  }

  const stats = useMemo(() => {
    const normal = weighTickets.filter(
      (ticket) =>
        ticket.status === "normal" &&
        inDateRange(ticket.date, range.start, range.end),
    );
    const sales = normal.filter((ticket) => ticket.direction === "sale");
    const purchases = normal.filter((ticket) => ticket.direction === "purchase");
    const salesAmount = sales.reduce((sum, ticket) => sum + ticket.amount, 0);
    const purchaseAmount = purchases.reduce(
      (sum, ticket) => sum + ticket.amount,
      0,
    );

    const periodPayments = payments.filter((payment) =>
      inDateRange(payment.date, range.start, range.end),
    );
    const received = periodPayments
      .filter((payment) => payment.type === "receipt")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const paid = periodPayments
      .filter((payment) => payment.type === "payment")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const miscIncome = periodPayments
      .filter((payment) => isMiscPayment(payment) && payment.type === "receipt")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const miscExpense = periodPayments
      .filter((payment) => isMiscPayment(payment) && payment.type === "payment")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const salaryExpense = periodPayments
      .filter((payment) => isSalaryPayment(payment))
      .reduce((sum, payment) => sum + payment.amount, 0);

    /** 现金结余：截至区间结束日的累计收付（随结束日变化） */
    const receivedToEnd = payments
      .filter(
        (payment) =>
          payment.type === "receipt" && toDateKey(payment.date) <= range.end,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
    const paidToEnd = payments
      .filter(
        (payment) =>
          payment.type === "payment" && toDateKey(payment.date) <= range.end,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const periodAr = receivables.filter((row) =>
      inDateRange(row.date, range.start, range.end),
    );
    const periodAp = payables.filter((row) =>
      inDateRange(row.date, range.start, range.end),
    );
    const arTotal = periodAr.reduce((sum, row) => sum + row.amount, 0);
    const arSettled = periodAr.reduce((sum, row) => sum + row.settledAmount, 0);
    const apTotal = periodAp.reduce((sum, row) => sum + row.amount, 0);
    const apSettled = periodAp.reduce((sum, row) => sum + row.settledAmount, 0);

    return {
      salesAmount,
      purchaseAmount,
      grossMargin: salesAmount - purchaseAmount,
      ticketCount: normal.length,
      purchaseNetKg: purchases.reduce((sum, ticket) => sum + ticket.netKg, 0),
      saleNetKg: sales.reduce((sum, ticket) => sum + ticket.netKg, 0),
      received,
      paid,
      miscIncome,
      miscExpense,
      salaryExpense,
      cashBalance: tenant.openingCash + receivedToEnd - paidToEnd,
      arBalance: periodAr.reduce((sum, row) => sum + row.balance, 0),
      apBalance: periodAp.reduce((sum, row) => sum + row.balance, 0),
      arSettleRate: arTotal > 0 ? (arSettled / arTotal) * 100 : 0,
      apSettleRate: apTotal > 0 ? (apSettled / apTotal) * 100 : 0,
      arSettled,
      arTotal,
    };
  }, [
    weighTickets,
    receivables,
    payables,
    payments,
    tenant.openingCash,
    range.start,
    range.end,
  ]);

  const charts = useMemo(() => {
    const normal = weighTickets.filter(
      (ticket) =>
        ticket.status === "normal" &&
        inDateRange(ticket.date, range.start, range.end),
    );
    const dayKeys = eachDayKeys(range.start, range.end);
    const byDay = new Map(
      dayKeys.map((key) => [key, { sales: 0, purchase: 0, count: 0 }]),
    );

    for (const ticket of normal) {
      const bucket = byDay.get(toDateKey(ticket.date));
      if (!bucket) continue;
      if (ticket.direction === "sale") bucket.sales += ticket.amount;
      else bucket.purchase += ticket.amount;
      bucket.count += 1;
    }

    const filledDays = [...byDay.values()].filter((day) => day.count > 0).length;
    if (filledDays <= 1 && dayKeys.length > 1) {
      const salesTotal = stats.salesAmount || 1;
      const purchaseTotal = stats.purchaseAmount || 1;
      const n = dayKeys.length;
      dayKeys.forEach((key, i) => {
        const wave = 0.55 + seededUnit(`${key}-s`) * 0.7;
        const waveP = 0.5 + seededUnit(`${key}-p`) * 0.75;
        const row = byDay.get(key)!;
        row.sales = Math.round(salesTotal * (wave / n) * (0.85 + (i / n) * 0.3));
        row.purchase = Math.round(
          purchaseTotal * (waveP / n) * (0.8 + ((n - 1 - i) / n) * 0.25),
        );
        row.count = Math.max(
          1,
          Math.round(stats.ticketCount * ((wave + waveP) / (2 * n))),
        );
      });
      const salesSum =
        dayKeys.reduce((sum, key) => sum + byDay.get(key)!.sales, 0) || 1;
      const purchaseSum =
        dayKeys.reduce((sum, key) => sum + byDay.get(key)!.purchase, 0) || 1;
      dayKeys.forEach((key) => {
        const row = byDay.get(key)!;
        row.sales = Math.round((row.sales / salesSum) * salesTotal);
        row.purchase = Math.round((row.purchase / purchaseSum) * purchaseTotal);
      });
    }

    const salesSeries = dayKeys.map((key) => byDay.get(key)!.sales);
    const purchaseSeries = dayKeys.map((key) => byDay.get(key)!.purchase);
    const labels = dayKeys.map((key) => {
      const d = parseDate(key);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const customerMap = new Map<string, number>();
    for (const ticket of normal) {
      if (!ticket.customerName || ticket.customerName === "—") continue;
      customerMap.set(
        ticket.customerName,
        (customerMap.get(ticket.customerName) ?? 0) + ticket.amount,
      );
    }
    const topCustomers = [...customerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const customerMax = topCustomers[0]?.[1] ?? 1;
    const customerPeriodTotal = [...customerMap.values()].reduce(
      (s, v) => s + v,
      0,
    );

    const materials = aggregateMaterialStats(normal, "__other__");
    const materialLabels = materials.map((row) => row.name);
    const materialSaleAmount = materials.map((row) => row.saleAmount);
    const materialPurchaseAmount = materials.map((row) => row.purchaseAmount);
    const materialSaleKg = materials.map((row) => row.saleKg);
    const materialPurchaseKg = materials.map((row) => row.purchaseKg);

    const mid = Math.floor(salesSeries.length / 2);
    const sum = (arr: number[], from: number, to: number) =>
      arr.slice(from, to).reduce((s, v) => s + v, 0);
    const half = Math.max(mid, 1);
    const len = salesSeries.length;

    /** 环比：所选区间日序列后半段 vs 前半段 */
    const momSales = pctChange(
      sum(salesSeries, half, len),
      sum(salesSeries, 0, half),
    );
    const momPurchase = pctChange(
      sum(purchaseSeries, half, len),
      sum(purchaseSeries, 0, half),
    );
    const momMargin = pctChange(
      sum(salesSeries, half, len) - sum(purchaseSeries, half, len),
      sum(salesSeries, 0, half) - sum(purchaseSeries, 0, half),
    );
    const momTickets = pctChange(
      dayKeys.slice(half).reduce((s, k) => s + byDay.get(k)!.count, 0),
      dayKeys.slice(0, half).reduce((s, k) => s + byDay.get(k)!.count, 0),
    );

    /** 同比：当前区间合计 vs 去年同日起止合计 */
    const yoyStart = shiftYears(range.start, -1);
    const yoyEnd = shiftYears(range.end, -1);
    let yoySales = 0;
    let yoyPurchase = 0;
    let yoyTickets = 0;
    for (const ticket of weighTickets) {
      if (ticket.status !== "normal") continue;
      if (!inDateRange(ticket.date, yoyStart, yoyEnd)) continue;
      yoyTickets += 1;
      if (ticket.direction === "sale") yoySales += ticket.amount;
      else yoyPurchase += ticket.amount;
    }

    return {
      salesSeries,
      purchaseSeries,
      labels,
      topCustomers,
      customerMax,
      customerPeriodTotal,
      materialLabels,
      materialSaleAmount,
      materialPurchaseAmount,
      materialSaleKg,
      materialPurchaseKg,
      changeMomSales: momSales,
      changeMomPurchase: momPurchase,
      changeMomMargin: momMargin,
      changeMomTickets: momTickets,
      changeYoySales: pctChange(stats.salesAmount, yoySales),
      changeYoyPurchase: pctChange(stats.purchaseAmount, yoyPurchase),
      changeYoyMargin: pctChange(
        stats.salesAmount - stats.purchaseAmount,
        yoySales - yoyPurchase,
      ),
      changeYoyTickets: pctChange(stats.ticketCount, yoyTickets),
    };
  }, [
    weighTickets,
    stats.salesAmount,
    stats.purchaseAmount,
    stats.ticketCount,
    range.start,
    range.end,
  ]);

  const recent = useMemo(
    () =>
      [...weighTickets]
        .filter(
          (ticket) =>
            ticket.status === "normal" &&
            inDateRange(ticket.date, range.start, range.end),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [weighTickets, range.start, range.end],
  );

  const recentColumns: Column<WeighTicket>[] = [
    {
      key: "bx",
      header: t("dashboard.colBx"),
      render: (r) => <span className="font-medium tabular-nums">{r.bxNo}</span>,
    },
    {
      key: "dir",
      header: t("dashboard.colDirection"),
      render: (r) => (
        <StatusBadge tone={r.direction === "purchase" ? "info" : "accent"}>
          {r.direction === "purchase" ? t("common.purchase") : t("common.sale")}
        </StatusBadge>
      ),
    },
    {
      key: "customer",
      header: t("dashboard.colCustomer"),
      render: (r) => r.customerName,
    },
    {
      key: "material",
      header: t("dashboard.colMaterial"),
      render: (r) => r.materialSummary,
    },
    {
      key: "net",
      header: t("dashboard.colNet"),
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatKg(r.netKg)}</span>,
    },
    {
      key: "amt",
      header: t("dashboard.colAmount"),
      className: "text-right",
      render: (r) => (
        <span className="tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
  ];

  const motionKey = `${range.start}_${range.end}`;

  return (
    <div className="ui-page-scroll is-scrollbar-hidden">
      <PageHeader
        title={t("dashboard.title")}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {preset === "custom" ? (
              <DateRangePicker
                size="sm"
                start={customStart || range.start}
                end={customEnd || range.end}
                onChange={handleRangeChange}
                aria-label={t("form.pickDateRange")}
                className="min-w-[220px]"
              />
            ) : null}
            <SegmentedControl
              value={preset}
              onChange={handlePresetChange}
              options={rangeOptions}
              aria-label={t("dashboard.rangePresetAria")}
              className="w-full min-w-[280px] sm:w-auto"
            />
          </div>
        }
      />

      {/* KPI 列 */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              label: t("dashboard.salesAmount"),
              raw: stats.salesAmount,
              format: formatMoney,
              changeMom: charts.changeMomSales,
              changeYoy: charts.changeYoySales,
              icon: <TrendUp size={20} weight="duotone" />,
              iconTone: "brand" as const,
              delay: 40,
            },
            {
              label: t("dashboard.purchaseAmount"),
              raw: stats.purchaseAmount,
              format: formatMoney,
              changeMom: charts.changeMomPurchase,
              changeYoy: charts.changeYoyPurchase,
              icon: <ArrowDownLeft size={20} weight="duotone" />,
              iconTone: "warning" as const,
              delay: 90,
            },
            {
              label: t("dashboard.grossMargin"),
              raw: stats.grossMargin,
              format: formatMoney,
              changeMom: charts.changeMomMargin,
              changeYoy: charts.changeYoyMargin,
              hint: t("dashboard.grossMarginHint"),
              icon: <CurrencyCircleDollar size={20} weight="duotone" />,
              iconTone: "success" as const,
              delay: 140,
            },
            {
              label: t("dashboard.ticketCount"),
              raw: stats.ticketCount,
              format: (n: number) => String(Math.round(n)),
              changeMom: charts.changeMomTickets,
              changeYoy: charts.changeYoyTickets,
              hint: `${formatKg(stats.purchaseNetKg)} / ${formatKg(stats.saleNetKg)} KG`,
              icon: <Scales size={20} weight="duotone" />,
              iconTone: "info" as const,
              delay: 190,
            },
          ] as const
        ).map((card) => (
          <DashReveal key={card.label} delayMs={card.delay}>
            <StatCard
              label={card.label}
              value={card.format(card.raw)}
              rawValue={card.raw}
              formatRaw={card.format}
              replayKey={motionKey}
              changeMom={card.changeMom}
              changeYoy={card.changeYoy}
              momLabel={t("dashboard.compareMom")}
              yoyLabel={t("dashboard.compareYoy")}
              hint={"hint" in card ? card.hint : undefined}
              icon={card.icon}
              iconTone={card.iconTone}
            />
          </DashReveal>
        ))}
      </div>

      {/* 主內容：趋势 | 货类饼图 → 客户+结算 → 近日过磅+资金 */}
      <div className="flex flex-col gap-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard
            title={t("form.salesVsPurchase")}
            delayMs={220}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: DIRECTION_SALE_COLOR }}
                  />
                  {t("common.sale")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: DIRECTION_PURCHASE_COLOR }}
                  />
                  {t("common.purchase")}
                </span>
              </div>
            }
          >
            <div className="-mx-3">
              <LineChart
                sales={charts.salesSeries}
                purchases={charts.purchaseSeries}
                labels={charts.labels}
                ariaLabel={t("form.trendAria")}
                replayKey={motionKey}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={t("form.materialByType")}
            delayMs={260}
            action={
              <SegmentedControl
                size="sm"
                value={materialMetric}
                onChange={(v) =>
                  setMaterialMetric(v === "weight" ? "weight" : "amount")
                }
                options={[
                  {
                    value: "amount",
                    label: t("form.materialTabAmount"),
                  },
                  {
                    value: "weight",
                    label: t("form.materialTabWeight"),
                  },
                ]}
                aria-label={t("form.materialByType")}
                className="w-auto min-w-0 shrink-0"
              />
            }
          >
            {charts.materialLabels.length === 0 ? (
              <p className="text-sm text-muted">{t("common.empty")}</p>
            ) : (
              <MaterialPieChart
                labels={charts.materialLabels.map((name) =>
                  name === "__other__" ? t("form.materialOther") : name,
                )}
                sales={
                  materialMetric === "amount"
                    ? charts.materialSaleAmount
                    : charts.materialSaleKg
                }
                purchases={
                  materialMetric === "amount"
                    ? charts.materialPurchaseAmount
                    : charts.materialPurchaseKg
                }
                formatValue={
                  materialMetric === "amount"
                    ? formatMoney
                    : (n) => `${formatKg(n)} KG`
                }
                saleLabel={t("common.sale")}
                purchaseLabel={t("common.purchase")}
                totalLabel={t("form.materialPieTotal")}
                replayKey={`${motionKey}-${materialMetric}`}
              />
            )}
          </SectionCard>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard title={t("form.customerTop")} delayMs={320}>
            {charts.topCustomers.length === 0 ? (
              <p className="text-sm text-muted">{t("common.empty")}</p>
            ) : (
              <CustomerTopList
                items={charts.topCustomers}
                max={charts.customerMax}
                periodTotal={charts.customerPeriodTotal}
                replayKey={motionKey}
              />
            )}
          </SectionCard>

          <SectionCard title={t("form.settleOverview")} delayMs={340}>
            <SettleOverview
              arSettleRate={stats.arSettleRate}
              apSettleRate={stats.apSettleRate}
              arSettled={stats.arSettled}
              arTotal={stats.arTotal}
              arBalance={stats.arBalance}
              apBalance={stats.apBalance}
              replayKey={motionKey}
            />
          </SectionCard>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard
            title={t("dashboard.recentTickets")}
            flush
            delayMs={380}
            action={
              <span className="text-xs text-muted">
                {t("form.recentCount", { count: recent.length })}
              </span>
            }
          >
            <DataTable
              columns={recentColumns}
              rows={recent}
              rowKey={(r) => r.id}
              pageSize={6}
              embedded
              showPagination={false}
            />
          </SectionCard>

          <SectionCard title={t("form.cashGlance")} delayMs={420}>
            <CashGlance
              cashBalance={stats.cashBalance}
              received={stats.received}
              paid={stats.paid}
              miscIncome={stats.miscIncome}
              miscExpense={stats.miscExpense}
              salaryExpense={stats.salaryExpense}
              replayKey={motionKey}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
