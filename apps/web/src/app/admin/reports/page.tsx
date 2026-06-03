"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import dayjs from "dayjs";

const TABS = ["attendance", "visits", "compliance", "orders", "stock", "daily_summary"] as const;
const TAB_LABELS: Record<string, string> = {
  attendance: "Attendance", visits: "Visits", compliance: "Compliance",
  orders: "Orders", stock: "Stock", daily_summary: "Daily Summary",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [startDate, setStartDate] = useState(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [repId, setRepId] = useState("");
  const [territory, setTerritory] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", activeTab, startDate, endDate, repId, territory, state, page],
    queryFn: () => {
      const endpointMap: Record<string, string> = {
        daily_summary: "/reports/daily-summary",
        compliance: "/reports/compliance",
        orders: "/reports/orders",
        stock: "/reports/stock",
        attendance: "/reports/attendance",
        visits: "/reports/visits",
      };
      const endpoint = endpointMap[activeTab] ?? `/reports/${activeTab}`;
      return apiClient.get(endpoint, {
        params: {
          startDate: activeTab !== "daily_summary" ? startDate : undefined,
          endDate: activeTab !== "daily_summary" ? endDate : undefined,
          date: activeTab === "daily_summary" ? endDate : undefined,
          repId: repId || undefined,
          territory: territory || undefined,
          state: state || undefined,
          page,
          pageSize: 25,
        },
      }).then(r => r.data);
    },
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;
  const summaryData = activeTab === "daily_summary" ? (Array.isArray(data?.data) ? data?.data[0] : data?.data) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">Analytics and operational reports</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-40" />
        <Input placeholder="Rep ID" value={repId} onChange={e => setRepId(e.target.value)} className="h-9 w-24" />
        <Input placeholder="Territory" value={territory} onChange={e => setTerritory(e.target.value)} className="h-9 w-28" />
        <Input placeholder="State" value={state} onChange={e => setState(e.target.value)} className="h-9 w-24" />
      </div>

      {isError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">Failed to load report data. Please try again.</div>
      )}

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map(t => <TabsTrigger key={t} value={t}>{TAB_LABELS[t]}</TabsTrigger>)}
        </TabsList>

        {/* Daily Summary special view */}
        <TabsContent value="daily_summary">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : summaryData ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
              {[
                { label: "Active Reps", value: summaryData.activeReps, color: "bg-blue-50 border-blue-200" },
                { label: "Orders Count", value: summaryData.ordersCount, color: "bg-green-50 border-green-200" },
                { label: "Orders Value", value: `₹${(summaryData.ordersValue || 0).toLocaleString()}`, color: "bg-green-50 border-green-200" },
                { label: "Pending Approvals", value: summaryData.pendingApprovals, color: "bg-amber-50 border-amber-200" },
                { label: "Low Stock Items", value: summaryData.lowStockItems, color: "bg-red-50 border-red-200" },
              ].map(item => (
                <Card key={item.label} className={`border ${item.color}`}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value ?? "—"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No data for selected date</p>
          )}
        </TabsContent>

        {/* All other tabs use a table */}
        {TABS.filter(t => t !== "daily_summary").map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tab === "attendance" && ["Rep", "Date", "Check In", "Check Out", "Status"].map(h => <TableHead key={h}>{h}</TableHead>)}
                      {tab === "visits" && ["Rep", "Distributor", "Visited At", "Status"].map(h => <TableHead key={h}>{h}</TableHead>)}
                      {tab === "compliance" && ["Rep", "Planned", "Visited", "Verified", "% Rate"].map(h => <TableHead key={h}>{h}</TableHead>)}
                      {tab === "orders" && ["Rep", "Distributor", "Total", "Status", "Date"].map(h => <TableHead key={h}>{h}</TableHead>)}
                      {tab === "stock" && ["SKU", "Product", "Physical", "Available"].map(h => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No data for selected filters</TableCell></TableRow>
                    ) : rows.map((row: Record<string, unknown>, idx: number) => (
                      <TableRow key={(row.id as string) ?? idx}>
                        {tab === "attendance" && <>
                          <TableCell>{row.repName as string}</TableCell>
                          <TableCell>{dayjs(row.date as string).format("DD MMM")}</TableCell>
                          <TableCell>{row.checkInTime ? dayjs(row.checkInTime as string).format("HH:mm") : "—"}</TableCell>
                          <TableCell>{row.checkOutTime ? dayjs(row.checkOutTime as string).format("HH:mm") : "—"}</TableCell>
                          <TableCell><StatusBadge status={row.status as string} /></TableCell>
                        </>}
                        {tab === "visits" && <>
                          <TableCell>{row.repName as string}</TableCell>
                          <TableCell className="font-medium">{row.distributorName as string}</TableCell>
                          <TableCell>{row.visitedAt ? dayjs(row.visitedAt as string).format("DD MMM HH:mm") : "—"}</TableCell>
                          <TableCell><StatusBadge status={row.status as string} /></TableCell>
                        </>}
                        {tab === "compliance" && <>
                          <TableCell className="font-medium">{row.repName as string}</TableCell>
                          <TableCell>{row.planned as number}</TableCell>
                          <TableCell>{row.visited as number}</TableCell>
                          <TableCell>{row.verified as number}</TableCell>
                          <TableCell>
                            <Badge variant={(row.rate as number) >= 80 ? "success" : (row.rate as number) >= 50 ? "warning" : "destructive"}>
                              {row.rate as number}%
                            </Badge>
                          </TableCell>
                        </>}
                        {tab === "orders" && <>
                          <TableCell>{row.repName as string}</TableCell>
                          <TableCell className="font-medium">{row.distributorName as string}</TableCell>
                          <TableCell>₹{Number(row.totalAmount || 0).toLocaleString()}</TableCell>
                          <TableCell><StatusBadge status={row.status as string} /></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{dayjs(row.createdAt as string).format("DD MMM HH:mm")}</TableCell>
                        </>}
                        {tab === "stock" && <>
                          <TableCell className="font-mono text-xs">{row.sku as string}</TableCell>
                          <TableCell className="font-medium">{row.productName as string}</TableCell>
                          <TableCell>{row.physicalQty as number}</TableCell>
                          <TableCell className={`font-bold ${(row.availableQty as number) <= 10 ? "text-red-600" : ""}`}>{row.availableQty as number}</TableCell>
                        </>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {meta && (
                  <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                    <span>{rows.length} of {meta.total}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={rows.length < 25}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
