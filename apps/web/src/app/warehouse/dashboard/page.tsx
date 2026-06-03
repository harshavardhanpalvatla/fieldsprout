"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";

dayjs.extend(relativeTime);

interface Order {
  id: string;
  status: string;
  distributor?: { name?: string };
  rep?: { name?: string };
  totalAmount?: number;
  submittedAt?: string;
  createdAt?: string;
  _count?: { items?: number };
}

function KpiCard({ title, value, subtitle, iconEl, color, href }: {
  title: string; value: string | number; subtitle?: string;
  iconEl: React.ReactNode; color: string; href: string;
}) {
  const router = useRouter();
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full" onClick={() => router.push(href)}>
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

export default function WarehouseDashboard() {
  const qc = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [stockError, setStockError] = useState<string[] | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const { data: pendingOrders, isLoading: pendingLoading } = useQuery<Order[]>({
    queryKey: ["wh-pending"],
    queryFn: () => apiClient.get("/orders?status=submitted&pageSize=20").then(r => r.data.data ?? []),
    refetchInterval: 15000,
  });

  const { data: approvedOrders } = useQuery<Order[]>({
    queryKey: ["wh-approved"],
    queryFn: () => apiClient.get("/orders?status=approved&pageSize=20").then(r => r.data.data ?? []),
    refetchInterval: 15000,
  });

  const { data: lowStockCount } = useQuery<number>({
    queryKey: ["wh-low-stock"],
    queryFn: () => apiClient.get("/stock?lowOnly=true&pageSize=1").then(r => r.data.meta?.total ?? 0),
    refetchInterval: 60000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["wh-pending"] });
    qc.invalidateQueries({ queryKey: ["wh-approved"] });
  }

  const approve = useMutation({
    mutationFn: (id: string) => apiClient.post(`/orders/${id}/approve`),
    onSuccess: () => { invalidate(); showToast("Order approved — stock reserved."); },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { details?: { skus?: { sku: string }[] }; message?: string } } } };
      const skus = err?.response?.data?.error?.details?.skus;
      if (skus?.length) setStockError(skus.map((s: { sku: string }) => s.sku));
      else showToast(err?.response?.data?.error?.message ?? "Failed to approve", "error");
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/orders/${id}/reject`, { reason }),
    onSuccess: () => {
      invalidate();
      setRejectDialog({ open: false, orderId: "" });
      setRejectReason("");
      showToast("Order rejected.");
    },
    onError: () => showToast("Failed to reject.", "error"),
  });

  const dispatch = useMutation({
    mutationFn: (id: string) => apiClient.post(`/orders/${id}/dispatch`),
    onSuccess: () => { invalidate(); showToast("Order dispatched."); },
    onError: () => showToast("Failed to dispatch.", "error"),
  });

  const pending = pendingOrders ?? [];
  const approved = approvedOrders ?? [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <KpiCard
          title="Needs Approval"
          value={pendingLoading ? "—" : pending.length}
          subtitle="Waiting for your action"
          iconEl={<ClipboardList className="h-4 w-4" />}
          color={pending.length > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}
          href="/warehouse/orders"
        />
        <KpiCard
          title="Ready to Dispatch"
          value={approved.length}
          subtitle="Approved, stock reserved"
          iconEl={<Truck className="h-4 w-4" />}
          color="bg-green-100 text-green-600"
          href="/warehouse/orders"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={lowStockCount ?? 0}
          subtitle="Items below threshold"
          iconEl={<AlertCircle className="h-4 w-4" />}
          color={(lowStockCount ?? 0) > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}
          href="/warehouse/stock"
        />
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Needs Approval</CardTitle>
            <CardDescription>Orders waiting for your review</CardDescription>
          </div>
          {pending.length > 0 && (
            <Badge variant="destructive">{pending.length}</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {pendingLoading && <p className="px-6 py-8 text-sm text-muted-foreground">Loading orders...</p>}
          {!pendingLoading && pending.length === 0 && (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">All caught up</p>
              <p className="text-xs text-muted-foreground mt-1">No orders waiting for approval</p>
            </div>
          )}
          {pending.map((order: Order) => (
            <div key={order.id} className="flex items-center justify-between px-6 py-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-semibold truncate">{order.distributor?.name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  via {order.rep?.name ?? "—"} · ₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN")} · {order._count?.items ?? "?"} items · {dayjs(order.submittedAt ?? order.createdAt).fromNow()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => approve.mutate(order.id)} disabled={approve.isPending}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setRejectDialog({ open: true, orderId: order.id })}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ready to dispatch */}
      {approved.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Ready to Dispatch</CardTitle>
              <CardDescription>Approved orders, stock reserved</CardDescription>
            </div>
            <Badge variant="default">{approved.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {approved.map((order: Order) => (
              <div key={order.id} className="flex items-center justify-between px-6 py-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-semibold truncate">{order.distributor?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    via {order.rep?.name ?? "—"} · ₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => dispatch.mutate(order.id)} disabled={dispatch.isPending}>
                  <Truck className="h-3 w-3 mr-1" /> Dispatch
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => { if (!open) { setRejectDialog({ open: false, orderId: "" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>The rep will see this reason. Be specific.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient stock, pricing issue..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, orderId: "" })}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || reject.isPending}
              onClick={() => reject.mutate({ id: rejectDialog.orderId, reason: rejectReason })}>
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock error dialog */}
      <Dialog open={!!stockError} onOpenChange={() => setStockError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insufficient Stock</DialogTitle>
            <DialogDescription>Not enough stock to fulfil this order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-2">Affected SKUs:</p>
            {stockError?.map(sku => <Badge key={sku} variant="destructive" className="mr-1">{sku}</Badge>)}
          </div>
          <DialogFooter>
            <Button onClick={() => setStockError(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
