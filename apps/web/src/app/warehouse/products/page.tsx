"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, ChevronDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { Product } from "@/types";
import dayjs from "dayjs";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [productDialog, setProductDialog] = useState(false);
  const [variantDialog, setVariantDialog] = useState<{ open: boolean; productId: string; productName: string }>({ open: false, productId: "", productName: "" });
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [importDialog, setImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [pForm, setPForm] = useState({ name: "", category: "", description: "", imageUrl: "", regions: "" });
  const [vForm, setVForm] = useState({ sku: "", unit: "", price: "", effectiveFrom: dayjs().format("YYYY-MM-DD") });
  const qc = useQueryClient();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const { data, isLoading } = useQuery({
    queryKey: ["products", page],
    queryFn: () => apiClient.get("/products", { params: { page, pageSize: 25 } }).then(r => r.data),
  });

  const createProductMutation = useMutation({
    mutationFn: (d: typeof pForm) => apiClient.post("/products", { ...d, regions: d.regions.split(",").map(r => r.trim()) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setProductDialog(false); showToast("Product created"); },
  });

  const addVariantMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: typeof vForm }) =>
      apiClient.post(`/products/${productId}/variants`, { ...data, price: Number(data.price), effectiveFrom: data.effectiveFrom }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setVariantDialog({ open: false, productId: "", productName: "" }); showToast("Variant added"); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (productId: string) => apiClient.post(`/products/${productId}/deactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setDeactivateConfirm({ open: false, product: null }); showToast("Product deactivated"); },
  });

  const importMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: (_file: File) => { showToast("Bulk import not available in this version"); return Promise.resolve({ data: { data: null } }); },
    onSuccess: () => { setImportDialog(false); },
  });

  const rows: Product[] = data?.data ?? [];
  const meta = data?.meta;

  function toggleExpand(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white bg-green-600 shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">Manage product catalog and variants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialog(true)}><Upload className="h-4 w-4 mr-1" /> Import Excel</Button>
          <Button size="sm" onClick={() => setProductDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No products found. Add one or import from Excel.</TableCell></TableRow>
              ) : rows.map(product => (
                <React.Fragment key={product.id}>
                  <TableRow>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(product.id)}>
                        {expandedRows.has(product.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category}</TableCell>
                    <TableCell className="text-muted-foreground">{product.variants?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setVariantDialog({ open: true, productId: product.id, productName: product.name })}>
                          + Variant
                        </Button>
                        {product.status === "active" && (
                          <Button variant="outline" size="sm" className="text-destructive border-destructive"
                            onClick={() => setDeactivateConfirm({ open: true, product })}>Deactivate</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(product.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 py-2 px-8">
                        {(product.variants ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No variants yet.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {["SKU", "Unit", "Price", "Effective From"].map(h => (
                                  <th key={h} className="py-1 px-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {product.variants?.map(v => (
                                <tr key={v.id} className="border-b last:border-0">
                                  <td className="py-1 px-2 font-mono text-xs">{v.sku}</td>
                                  <td className="py-1 px-2">{v.unit}</td>
                                  <td className="py-1 px-2">₹{v.price}</td>
                                  <td className="py-1 px-2 text-muted-foreground">{dayjs(v.effectiveFrom).format("DD MMM YYYY")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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

      {/* Add Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Product Name *</Label><Input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Category *</Label><Input value={pForm.category} onChange={e => setPForm({ ...pForm, category: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label>Image URL</Label><Input value={pForm.imageUrl} onChange={e => setPForm({ ...pForm, imageUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1"><Label>Regions (comma-separated) *</Label><Input value={pForm.regions} onChange={e => setPForm({ ...pForm, regions: e.target.value })} placeholder="e.g. North, South, West" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button disabled={createProductMutation.isPending} onClick={() => createProductMutation.mutate(pForm)}>Create Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <Dialog open={variantDialog.open} onOpenChange={open => { if (!open) setVariantDialog({ open: false, productId: "", productName: "" }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Variant: {variantDialog.productName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>SKU *</Label><Input value={vForm.sku} onChange={e => setVForm({ ...vForm, sku: e.target.value })} /></div>
            <div className="space-y-1"><Label>Unit *</Label><Input value={vForm.unit} onChange={e => setVForm({ ...vForm, unit: e.target.value })} placeholder="e.g. kg, bag, pack" /></div>
            <div className="space-y-1"><Label>Price *</Label><Input type="number" value={vForm.price} onChange={e => setVForm({ ...vForm, price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Effective From</Label><Input type="date" value={vForm.effectiveFrom} onChange={e => setVForm({ ...vForm, effectiveFrom: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialog({ open: false, productId: "", productName: "" })}>Cancel</Button>
            <Button disabled={addVariantMutation.isPending} onClick={() => addVariantMutation.mutate({ productId: variantDialog.productId, data: vForm })}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <Dialog open={deactivateConfirm.open} onOpenChange={open => { if (!open) setDeactivateConfirm({ open: false, product: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate Product</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to deactivate &ldquo;{deactivateConfirm.product?.name}&rdquo;?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirm({ open: false, product: null })}>Cancel</Button>
            <Button variant="destructive" disabled={deactivateMutation.isPending}
              onClick={() => deactivateConfirm.product && deactivateMutation.mutate(deactivateConfirm.product.id)}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={open => { if (!open) { setImportDialog(false); setImportResults(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Products from Excel</DialogTitle></DialogHeader>
          {importResults ? (
            <div className="space-y-2">
              <div className={`p-3 rounded text-sm ${importResults.failed === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                Created: {importResults.created} | Failed: {importResults.failed}
              </div>
              {importResults.errors?.map((e, i) => <div key={i} className="text-sm text-red-600">{e}</div>)}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Upload an Excel file (.xlsx) with product data</p>
              <label className="cursor-pointer">
                <Button asChild variant="outline"><span>{importMutation.isPending ? "Importing..." : "Choose File"}</span></Button>
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
