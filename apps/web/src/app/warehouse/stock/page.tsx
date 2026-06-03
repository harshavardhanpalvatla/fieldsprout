"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { Stock, StockMovement } from "@/types";
import dayjs from "dayjs";

export default function StockPage() {
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [restockDialog, setRestockDialog] = useState<{ open: boolean; stock: Stock | null }>({ open: false, stock: null });
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; stock: Stock | null }>({ open: false, stock: null });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; variantId: string; name: string }>({ open: false, variantId: "", name: "" });
  const [restockQty, setRestockQty] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const qc = useQueryClient();

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); }

  const { data, isLoading } = useQuery({
    queryKey: ["stock", filter, page],
    queryFn: () => apiClient.get("/stock", { params: { page, pageSize: 25 } }).then(r => r.data),
    enabled: filter === "all",
  });

  const { data: lowAlertsData, isLoading: lowAlertsLoading } = useQuery({
    queryKey: ['low-alerts'],
    queryFn: () => apiClient.get('/stock/low-alerts').then(r => r.data.data ?? []),
    enabled: filter === 'low',
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["stock", "history", historyDialog.variantId],
    queryFn: () => apiClient.get("/stock/history", { params: { variantId: historyDialog.variantId } }).then(r => r.data),
    enabled: !!historyDialog.variantId && historyDialog.open,
  });

  const restockMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      apiClient.post("/stock/restock", { variantId, quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); setRestockDialog({ open: false, stock: null }); setRestockQty(""); showToast("Stock restocked successfully"); },
    onError: () => showToast("Failed to restock", "error"),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ variantId, delta, reason }: { variantId: string; delta: number; reason: string }) =>
      apiClient.post("/stock/adjust", { variantId, delta, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); setAdjustDialog({ open: false, stock: null }); setAdjustDelta(""); setAdjustReason(""); showToast("Stock adjusted successfully"); },
    onError: () => showToast("Failed to adjust stock", "error"),
  });

  const rows: Stock[] = filter === 'low' ? (lowAlertsData ?? []) : (data?.data ?? []);
  const meta = filter === 'low' ? undefined : data?.meta;
  const currentLoading = filter === 'low' ? lowAlertsLoading : isLoading;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>
      )}

      <div>
        <h2 className="text-xl font-semibold">Stock Management</h2>
        <p className="text-sm text-muted-foreground">Monitor and manage warehouse inventory</p>
      </div>

      <div className="flex gap-2">
        {(["all", "low"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => { setFilter(f); setPage(1); }}>
            {f === "all" ? "All Items" : "Low Stock Only"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Physical</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No stock items found</TableCell></TableRow>
              ) : rows.map(stock => (
                <TableRow key={stock.id} className={stock.availableQty <= 10 ? "bg-amber-50/50" : ""}>
                  <TableCell className="font-mono text-xs font-bold">{stock.sku}</TableCell>
                  <TableCell className="font-medium">{stock.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{stock.unit}</TableCell>
                  <TableCell className="text-right">{stock.physicalQty}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stock.reservedQty}</TableCell>
                  <TableCell className={`text-right font-bold ${stock.availableQty <= 10 ? "text-red-600" : ""}`}>{stock.availableQty}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setRestockDialog({ open: true, stock })}>Restock</Button>
                      <Button variant="outline" size="sm" onClick={() => setAdjustDialog({ open: true, stock })}>Adjust</Button>
                      <Button variant="outline" size="sm" onClick={() => setHistoryDialog({ open: true, variantId: stock.variantId, name: stock.productName })}>History</Button>
                    </div>
                  </TableCell>
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

      {/* Restock Dialog */}
      <Dialog open={restockDialog.open} onOpenChange={open => { if (!open) { setRestockDialog({ open: false, stock: null }); setRestockQty(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restock: {restockDialog.stock?.productName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">SKU: {restockDialog.stock?.sku} | Current: {restockDialog.stock?.physicalQty} {restockDialog.stock?.unit}</p>
          <div className="space-y-2"><Label>Quantity to Add *</Label><Input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} min={1} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialog({ open: false, stock: null })}>Cancel</Button>
            <Button disabled={!restockQty || Number(restockQty) <= 0 || restockMutation.isPending}
              onClick={() => restockDialog.stock && restockMutation.mutate({ variantId: restockDialog.stock.variantId, quantity: Number(restockQty) })}>Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={open => { if (!open) { setAdjustDialog({ open: false, stock: null }); setAdjustDelta(""); setAdjustReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock: {adjustDialog.stock?.productName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">SKU: {adjustDialog.stock?.sku} | Current: {adjustDialog.stock?.physicalQty} {adjustDialog.stock?.unit}</p>
          <div className="space-y-2">
            <Label>Delta (positive or negative) *</Label>
            <Input type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} placeholder="e.g. -5 or +10" />
            <p className="text-xs text-muted-foreground">Use negative values to reduce stock</p>
          </div>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={2} placeholder="e.g. Damaged goods, inventory correction..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog({ open: false, stock: null })}>Cancel</Button>
            <Button disabled={!adjustDelta || !adjustReason.trim() || adjustMutation.isPending}
              onClick={() => adjustDialog.stock && adjustMutation.mutate({ variantId: adjustDialog.stock.variantId, delta: Number(adjustDelta), reason: adjustReason })}>Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={open => { if (!open) setHistoryDialog({ open: false, variantId: "", name: "" }); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Stock History: {historyDialog.name}</DialogTitle></DialogHeader>
          {historyLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyData?.data ?? []).map((m: StockMovement) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.type}</TableCell>
                    <TableCell className={`font-bold ${m.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.reason}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{dayjs(m.createdAt).format("DD MMM HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
