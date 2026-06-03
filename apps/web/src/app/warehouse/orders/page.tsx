"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import apiClient from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

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

export default function OrdersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("submitted");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [stockError, setStockError] = useState<string[] | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["orders-page", tab],
    queryFn: () => apiClient.get("/orders", { params: { status: tab, pageSize: 50 } }).then(r => r.data.data ?? []),
    refetchInterval: 15000,
  });

  const rows: Order[] = data ?? [];

  const approve = useMutation({
    mutationFn: (id: string) => apiClient.post(`/orders/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders-page"] }); showToast("Approved — stock reserved."); },
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
      qc.invalidateQueries({ queryKey: ["orders-page"] });
      setRejectDialog({ open: false, orderId: "" }); setRejectReason("");
      showToast("Order rejected.");
    },
    onError: () => showToast("Failed to reject.", "error"),
  });

  const dispatch = useMutation({
    mutationFn: (id: string) => apiClient.post(`/orders/${id}/dispatch`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders-page"] }); showToast("Dispatched."); },
    onError: () => showToast("Failed to dispatch.", "error"),
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold">Orders</h2>
        <p className="text-sm text-muted-foreground">Review and process incoming orders</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="submitted">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Ready to Dispatch</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              {isLoading && <p className="px-6 py-8 text-sm text-muted-foreground">Loading...</p>}
              {!isLoading && rows.length === 0 && (
                <p className="px-6 py-12 text-center text-sm text-muted-foreground">No orders in this status.</p>
              )}
              {rows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distributor</TableHead>
                      <TableHead>Rep</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((order: Order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{order.distributor?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{order.rep?.name ?? "—"}</TableCell>
                        <TableCell>₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{order._count?.items ?? "?"}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{dayjs(order.submittedAt ?? order.createdAt).fromNow()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === "submitted" && (
                              <>
                                <Button size="sm" onClick={() => approve.mutate(order.id)} disabled={approve.isPending}>Approve</Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => setRejectDialog({ open: true, orderId: order.id })}>Reject</Button>
                              </>
                            )}
                            {order.status === "approved" && (
                              <Button size="sm" variant="outline" onClick={() => dispatch.mutate(order.id)} disabled={dispatch.isPending}>
                                <Truck className="h-3 w-3 mr-1" />Dispatch
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => { if (!open) { setRejectDialog({ open: false, orderId: "" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>The rep will see this reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Be specific..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, orderId: "" })}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || reject.isPending}
              onClick={() => reject.mutate({ id: rejectDialog.orderId, reason: rejectReason })}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock error dialog */}
      <Dialog open={!!stockError} onOpenChange={() => setStockError(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insufficient Stock</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cannot approve — not enough stock for: <strong>{stockError?.join(", ")}</strong></p>
          <div className="flex flex-wrap gap-1 mt-2">
            {stockError?.map(sku => <Badge key={sku} variant="destructive">{sku}</Badge>)}
          </div>
          <DialogFooter><Button onClick={() => setStockError(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
