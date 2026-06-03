"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, ShoppingCart, AlertCircle, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import apiClient from "@/lib/api";
import dayjs from "dayjs";

function KpiCard({
  title, value, subtitle, iconEl, color, href,
}: {
  title: string; value: string | number; subtitle?: string;
  iconEl: React.ReactNode; color: string; href: string;
}) {
  const router = useRouter();
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow animate-fade-in h-full" onClick={() => router.push(href)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>{iconEl}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const today = dayjs().format("YYYY-MM-DD");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary", today],
    queryFn: () => apiClient.get(`/reports/daily-summary?date=${today}`).then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count"],
    queryFn: () => apiClient.get("/orders?status=submitted&pageSize=1").then(r => r.data.meta?.total ?? 0),
    refetchInterval: 30000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () => apiClient.get("/orders?pageSize=5").then(r => r.data.data ?? []),
    refetchInterval: 30000,
  });

  const { data: lowStockCount } = useQuery({
    queryKey: ["low-stock-count"],
    queryFn: () => apiClient.get("/stock/low-alerts").then(r => r.data.data?.length ?? 0),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard title="Reps in Field" value={isLoading ? "—" : summary?.activeReps ?? 0} subtitle="Active today"
          iconEl={<Users className="h-4 w-4" />} color="bg-blue-100 text-blue-600" href="/admin/tracking" />
        <KpiCard title="Orders Today" value={isLoading ? "—" : summary?.ordersCount ?? 0}
          subtitle={summary ? `₹${Number(summary.ordersValue).toLocaleString("en-IN")}` : undefined}
          iconEl={<ShoppingCart className="h-4 w-4" />} color="bg-green-100 text-green-600" href="/admin/reports" />
        <KpiCard title="Pending Approval" value={pendingCount ?? 0} subtitle="Awaiting warehouse"
          iconEl={<AlertCircle className="h-4 w-4" />}
          color={(pendingCount ?? 0) > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}
          href="/warehouse/orders" />
        <KpiCard title="Low Stock" value={lowStockCount ?? 0} subtitle="Needs restocking"
          iconEl={<TrendingUp className="h-4 w-4" />}
          color={(lowStockCount ?? 0) > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}
          href="/warehouse/stock" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <CardDescription>Latest order activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/admin/reports">View all <ArrowUpRight className="ml-1 h-3 w-3" /></a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!recentOrders?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              )}
              {recentOrders?.map((order: {
                id: string; distributor?: { name?: string }; repName?: string;
                totalAmount?: number; status: string;
              }) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0 animate-fade-in">
                  <div>
                    <p className="text-sm font-medium">{order.distributor?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.repName} · ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Add new user", href: "/admin/users", desc: "Create a sales rep or manager account" },
                { label: "Pending distributors", href: "/admin/distributors", desc: "Review and approve pending requests" },
                { label: "Notification settings", href: "/admin/notifications", desc: "Configure push, WhatsApp, SMS" },
                { label: "Audit log", href: "/admin/audit", desc: "View all system activity" },
              ].map(a => (
                <a key={a.href} href={a.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
