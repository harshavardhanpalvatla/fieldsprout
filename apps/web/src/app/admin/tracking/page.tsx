"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Navigation, CheckCircle2, XCircle, Clock } from "lucide-react";
import apiClient from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Real API shapes (verified against actual responses)
interface LiveRep {
  repId: string;
  name: string;      // NOT repName
  lat: number;
  lng: number;
  capturedAt: string; // NOT timestamp
  staleMinutes: number;
}

interface ComplianceDetail {
  distributorId: string;
  name: string;
  visited: boolean;
  geoVerified: boolean;
  checkinAt: string | null;
}

interface ComplianceData {
  repId: string;
  date: string;
  planned: number;
  visited: number;
  verified: number;
  details: ComplianceDetail[];
}

interface GpsHistoryPoint {
  id: string;
  repId: string;
  lat: number;
  lng: number;
  capturedAt: string; // NOT timestamp
}

interface Rep {
  id: string;
  name: string;
  phone: string;
  role: string;
  territory?: string;
  state?: string;
}

interface ActualVisit {
  id: string;
  repId: string;
  distributorId: string;
  geoVerified: boolean;
  checkinAt: string;
  checkoutAt: string | null;
  distributor?: { name?: string };
}

export default function TrackingPage() {
  const [selectedRep, setSelectedRep] = useState<{ id: string; name: string } | null>(null);
  const [replayRep, setReplayRep] = useState<{ id: string; name: string } | null>(null);
  const today = dayjs().format("YYYY-MM-DD");

  // 1. GPS live — uses correct field names from API
  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: ["gps", "live"],
    queryFn: () => apiClient.get("/gps/live").then(r => r.data.data as LiveRep[] ?? []),
    refetchInterval: 30000,
  });
  const liveReps: LiveRep[] = liveData ?? [];

  // 2. All reps (to build compliance table)
  const { data: repsData } = useQuery({
    queryKey: ["users", "reps"],
    queryFn: () => apiClient.get("/users?role=rep&pageSize=100").then(r => r.data.data as Rep[] ?? []),
  });
  const allReps: Rep[] = repsData ?? [];

  // 3. Compliance for selected rep (or first rep)
  const compRepId = selectedRep?.id ?? allReps[0]?.id;
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["compliance", compRepId, today],
    queryFn: () =>
      apiClient.get("/reports/compliance", { params: { repId: compRepId, date: today } })
        .then(r => r.data.data as ComplianceData),
    enabled: !!compRepId,
  });

  // 4. Visits for selected rep today
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ["visits", selectedRep?.id, today],
    queryFn: () =>
      apiClient.get("/visits", { params: { repId: selectedRep!.id, date: today, pageSize: 50 } })
        .then(r => r.data.data as ActualVisit[] ?? []),
    enabled: !!selectedRep,
  });
  const visits: ActualVisit[] = visitsData ?? [];

  // 5. GPS history for route replay
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["gps-history", replayRep?.id, today],
    queryFn: () =>
      apiClient.get(`/gps/history/${replayRep!.id}`, { params: { date: today } })
        .then(r => r.data.data as GpsHistoryPoint[] ?? []),
    enabled: !!replayRep,
  });
  const historyPoints: GpsHistoryPoint[] = historyData ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold">Live Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Field rep activity — {dayjs().format("dddd, D MMMM YYYY")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: rep list + visit detail */}
        <div className="space-y-4">
          {/* Checked-in reps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  In the Field
                </span>
                <Badge variant={liveReps.length > 0 ? "default" : "secondary"}>
                  {liveLoading ? "…" : liveReps.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {liveLoading && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
              )}
              {!liveLoading && liveReps.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No reps currently checked in
                </p>
              )}
              {liveReps.map(rep => (
                <div key={rep.repId}
                  className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors last:border-0 ${
                    selectedRep?.id === rep.repId ? "bg-green-50" : ""
                  }`}
                  onClick={() => setSelectedRep({ id: rep.repId, name: rep.name })}>
                  {/* Live dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      rep.staleMinutes < 5 ? "bg-green-500" : "bg-amber-400"
                    }`} />
                    {rep.staleMinutes < 5 && (
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rep.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rep.staleMinutes < 5
                        ? "Active now"
                        : `Last seen ${rep.staleMinutes}m ago`}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs px-2 flex-shrink-0"
                    onClick={e => { e.stopPropagation(); setReplayRep({ id: rep.repId, name: rep.name }); }}>
                    Route
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* All reps (for compliance selection) */}
          {allReps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  All Reps
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {allReps.map(rep => (
                  <div key={rep.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer hover:bg-muted/50 transition-colors last:border-0 ${
                      selectedRep?.id === rep.id ? "bg-green-50" : ""
                    }`}
                    onClick={() => setSelectedRep({ id: rep.id, name: rep.name })}>
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0">
                      {rep.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rep.name}</p>
                      {rep.territory && <p className="text-xs text-muted-foreground">{rep.territory}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: map placeholder + visits */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map */}
          <Card className="border-dashed border-2">
            <CardContent className="h-52 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-3xl mb-2">🗺️</div>
                <p className="font-medium text-sm">Google Maps</p>
                <p className="text-xs mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to .env.local</p>
                {liveReps.length > 0 && (
                  <Badge variant="default" className="mt-2">{liveReps.length} rep(s) in field</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visits for selected rep */}
          {selectedRep && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  {selectedRep.name}&apos;s Visits Today
                </CardTitle>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setReplayRep(selectedRep)}>
                  Route Replay
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {visitsLoading && <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>}
                {!visitsLoading && visits.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">No visits today</p>
                )}
                {visits.map(v => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                    {v.geoVerified
                      ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      : <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {v.distributor?.name ?? v.distributorId}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dayjs(v.checkinAt).format("HH:mm")}
                        {v.checkoutAt && ` – ${dayjs(v.checkoutAt).format("HH:mm")}`}
                      </p>
                    </div>
                    <Badge variant={v.geoVerified ? "success" : "warning"} className="text-xs">
                      {v.geoVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Compliance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Visit Compliance
            {selectedRep && <span className="font-normal text-muted-foreground ml-2">— {selectedRep.name}</span>}
          </CardTitle>
          {!selectedRep && allReps.length > 0 && (
            <p className="text-xs text-muted-foreground">Select a rep above to see their compliance details</p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {complianceLoading && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading...</p>
          )}
          {!complianceLoading && complianceData && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 divide-x border-b">
                {[
                  { label: "Planned", value: complianceData.planned },
                  { label: "Visited", value: complianceData.visited },
                  { label: "Geo Verified", value: complianceData.verified },
                ].map(s => (
                  <div key={s.label} className="px-6 py-4 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Distributor detail table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor</TableHead>
                    <TableHead>Visited</TableHead>
                    <TableHead>GPS Verified</TableHead>
                    <TableHead>Check-in Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceData.details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No distributors planned
                      </TableCell>
                    </TableRow>
                  ) : complianceData.details.map(d => (
                    <TableRow key={d.distributorId}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        {d.visited
                          ? <Badge variant="success">Yes</Badge>
                          : <Badge variant="secondary">No</Badge>}
                      </TableCell>
                      <TableCell>
                        {d.geoVerified
                          ? <Badge variant="success">Verified</Badge>
                          : <Badge variant="warning">Unverified</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.checkinAt ? dayjs(d.checkinAt).format("HH:mm") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          {!complianceLoading && !complianceData && !compRepId && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No reps found. Add reps via the Users page.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Route Replay Dialog */}
      <Dialog open={!!replayRep} onOpenChange={open => { if (!open) setReplayRep(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Route Replay — {replayRep?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">{today}</p>
          {historyLoading && <p className="text-sm text-muted-foreground">Loading GPS history...</p>}
          {!historyLoading && historyPoints.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No GPS points recorded today.</p>
              <p className="text-xs text-muted-foreground mt-1">GPS points are captured every 2 minutes while the rep is checked in.</p>
            </div>
          )}
          {historyPoints.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">{historyPoints.length} GPS points recorded</p>
              {historyPoints.map((point, i) => (
                <div key={point.id} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded text-sm">
                  <div className="text-xs text-muted-foreground w-6 flex-shrink-0">{i + 1}</div>
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-mono text-xs">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>
                    <p className="text-xs text-muted-foreground">{dayjs(point.capturedAt).format("HH:mm:ss")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
