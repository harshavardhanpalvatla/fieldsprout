"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { Distributor, User } from "@/types";

const STATUS_TABS = ["all", "pending", "active", "inactive"] as const;

export default function DistributorsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [addDialog, setAddDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; distributor: Distributor | null }>({ open: false, distributor: null });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; distributorId: string }>({ open: false, distributorId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [reassignDialog, setReassignDialog] = useState<{ open: boolean; distributorId: string }>({ open: false, distributorId: "" });
  const [selectedRep, setSelectedRep] = useState("");
  const [approveLat, setApproveLat] = useState("");
  const [approveLng, setApproveLng] = useState("");
  const [approveRadius, setApproveRadius] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", state: "", territory: "" });
  const qc = useQueryClient();

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  const currentStatus = activeTab === "all" ? "" : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ["distributors", activeTab, page],
    queryFn: () => apiClient.get("/distributors", { params: { page, pageSize: 25, status: currentStatus || undefined } }).then(r => r.data),
  });

  const { data: repsData } = useQuery({
    queryKey: ["users", "rep"],
    queryFn: () => apiClient.get("/users", { params: { role: "rep", pageSize: 100 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post("/distributors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["distributors"] }); setAddDialog(false); showToast("Distributor added"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, lat, lng, radius }: { id: string; lat?: number; lng?: number; radius?: number }) =>
      apiClient.post(`/distributors/${id}/approve`, { lat, lng, radius }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["distributors"] }); setApproveDialog({ open: false, distributor: null }); showToast("Distributor approved"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiClient.post(`/distributors/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["distributors"] }); setRejectDialog({ open: false, distributorId: "" }); setRejectReason(""); showToast("Distributor rejected"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ id, repId }: { id: string; repId: string }) => apiClient.post(`/distributors/${id}/reassign`, { assignedRepId: repId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["distributors"] }); setReassignDialog({ open: false, distributorId: "" }); setSelectedRep(""); showToast("Rep reassigned"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const importMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: (_file: File) => { showToast("Bulk import not available in this version", "error"); return Promise.resolve({ data: { data: null } }); },
    onSuccess: () => { setImportDialog(false); },
  });

  const rows: Distributor[] = data?.data ?? [];
  const meta = data?.meta;
  const reps: User[] = repsData?.data ?? [];

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Distributors</h2>
          <p className="text-sm text-muted-foreground">Manage distributor network and approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialog(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button size="sm" onClick={() => { setForm({ name: "", phone: "", address: "", state: "", territory: "" }); setAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Distributor
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          {STATUS_TABS.map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No distributors found</TableCell></TableRow>
                  ) : rows.map(d => (
                    <TableRow key={d.id} className={d.status === "pending" ? "bg-amber-50/50" : ""}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{d.state}</TableCell>
                      <TableCell className="text-muted-foreground">{d.territory}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.status === "pending" && <>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600"
                              onClick={() => setApproveDialog({ open: true, distributor: d })}>Approve</Button>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive"
                              onClick={() => setRejectDialog({ open: true, distributorId: d.id })}>Reject</Button>
                          </>}
                          <Button variant="outline" size="sm" onClick={() => setReassignDialog({ open: true, distributorId: d.id })}>Reassign</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                  <span>Showing {rows.length} of {meta.total}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={rows.length < 25}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Distributor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["name", "phone", "address", "state", "territory"] as const).map(k => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k} *</Label>
                {k === "address" ? (
                  <Textarea value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} rows={2} />
                ) : (
                  <Input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    placeholder={k === "phone" ? "+919876543210" : ""} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Add Distributor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={open => { if (!open) setApproveDialog({ open: false, distributor: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Distributor</DialogTitle>
            <DialogDescription>Confirm approval for <strong>{approveDialog.distributor?.name}</strong>. Optionally set geofence:</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Latitude (optional)</Label><Input type="number" value={approveLat} onChange={e => setApproveLat(e.target.value)} /></div>
            <div className="space-y-1"><Label>Longitude (optional)</Label><Input type="number" value={approveLng} onChange={e => setApproveLng(e.target.value)} /></div>
            <div className="space-y-1"><Label>Radius in meters (optional)</Label><Input type="number" value={approveRadius} onChange={e => setApproveRadius(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, distributor: null })}>Cancel</Button>
            <Button disabled={approveMutation.isPending} onClick={() => approveDialog.distributor && approveMutation.mutate({
              id: approveDialog.distributor.id,
              lat: approveLat ? Number(approveLat) : undefined,
              lng: approveLng ? Number(approveLng) : undefined,
              radius: approveRadius ? Number(approveRadius) : undefined,
            })}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => { if (!open) { setRejectDialog({ open: false, distributorId: "" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Distributor</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Reason *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, distributorId: "" })}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectDialog.distributorId, reason: rejectReason })}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialog.open} onOpenChange={open => { if (!open) { setReassignDialog({ open: false, distributorId: "" }); setSelectedRep(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign Sales Rep</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Sales Rep</Label>
            <select value={selectedRep} onChange={e => setSelectedRep(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select...</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialog({ open: false, distributorId: "" })}>Cancel</Button>
            <Button disabled={!selectedRep || reassignMutation.isPending}
              onClick={() => reassignMutation.mutate({ id: reassignDialog.distributorId, repId: selectedRep })}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={open => { if (!open) { setImportDialog(false); setImportResults(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Distributors</DialogTitle></DialogHeader>
          {importResults ? (
            <div className="space-y-2">
              <div className={`p-3 rounded text-sm ${importResults.failed === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                Created: {importResults.created} | Failed: {importResults.failed}
              </div>
              {importResults.errors?.map((e, i) => <div key={i} className="text-sm text-red-600">{e}</div>)}
            </div>
          ) : (
            <div className="text-center py-6">
              <label className="cursor-pointer">
                <Button asChild variant="outline"><span>{importMutation.isPending ? "Importing..." : "Choose Excel File"}</span></Button>
                <input type="file" hidden accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); }} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportResults(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
