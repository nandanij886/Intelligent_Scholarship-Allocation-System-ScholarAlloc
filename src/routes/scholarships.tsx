import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { WeightsEditor } from "@/components/weights-editor";
import { useInvalidateAll, useScholarships, useWeights } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { compactInr, inr } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { CATEGORIES, GENDERS, type Category, type Gender, type Scholarship, type Weights } from "@/lib/types";

export const Route = createFileRoute("/scholarships")({
  head: () => pageMeta("Scholarships", "Define scholarships with eligibility criteria, seats, award amounts and funds, and tune priority weights."),
  component: ScholarshipsPage,
});

const blank = (): Scholarship => ({ id: "", name: "", minMarks: 60, maxIncome: 800000, categories: [...CATEGORIES], seats: 3, amount: 50000, totalFund: 150000 });

function ScholarshipsPage() {
  const { data, isLoading, error, refetch } = useScholarships();
  const { data: weights } = useWeights();
  const invalidate = useInvalidateAll();
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [w, setW] = useState<Weights | null>(null);
  useEffect(() => { if (weights && !w) setW(weights); }, [weights, w]);

  const save = useMutation({
    mutationFn: (s: Scholarship) => (isNew ? api.createScholarship(s) : api.updateScholarship(s)),
    onSuccess: () => (toast.success("Scholarship saved"), setEditing(null), invalidate()),
  });
  const del = useMutation({ mutationFn: api.deleteScholarship, onSuccess: () => (toast.success("Scholarship deleted"), invalidate()) });

  const toggle = <T,>(arr: T[] | undefined, v: T) => (arr ?? []).includes(v) ? (arr ?? []).filter((x) => x !== v) : [...(arr ?? []), v];

  return (
    <div>
      <PageHeader
        unit="Records · Criteria"
        title="Scholarships"
        subtitle="Each scholarship has criteria, a number of seats, an award amount and a total fund."
        actions={<Button size="sm" onClick={() => (setIsNew(true), setEditing(blank()))}><Plus className="h-4 w-4" /> Add scholarship</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : !data?.length ? (
            <EmptyState title="No scholarships yet" hint="Add one to start allocating." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Criteria</TableHead><TableHead className="text-right">Seats</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Fund</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><div className="font-medium">{s.name}</div><div className="font-mono text-xs text-muted-foreground">{s.id}</div></TableCell>
                      <TableCell>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          <Badge variant="secondary">≥{s.minMarks}%</Badge>
                          <Badge variant="secondary">≤{compactInr(s.maxIncome)}</Badge>
                          {s.categories.length < CATEGORIES.length && <Badge variant="outline">{s.categories.join("/")}</Badge>}
                          {s.genders?.length ? <Badge variant="outline">{s.genders.join("/")}</Badge> : null}
                          {s.branches?.length ? <Badge variant="outline">{s.branches.join("/")}</Badge> : null}
                          {s.requireRural && <Badge variant="outline">Rural</Badge>}
                          {s.requireSports && <Badge variant="outline">Sports</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{s.seats}</TableCell>
                      <TableCell className="text-right">{inr(s.amount)}</TableCell>
                      <TableCell className="text-right">{compactInr(s.totalFund)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => (setIsNew(false), setEditing(s))}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => confirm(`Delete ${s.name}?`) && del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
        <Card className="h-fit p-4">
          <h2 className="mb-3 font-semibold text-foreground">Priority weights</h2>
          {w ? (
            <>
              <WeightsEditor value={w} onChange={setW} />
              <Button className="mt-4 w-full" size="sm" onClick={async () => (await api.saveWeights(w), toast.success("Weights saved"), invalidate())}>Save weights</Button>
            </>
          ) : <LoadingState />}
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Add scholarship" : "Edit scholarship"}</DialogTitle></DialogHeader>
          {editing && (
            <form
              id="sch-form"
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.id || !editing.name) { toast.error("ID and name are required"); return; }
                save.mutate(editing);
              }}
            >
              <F label="ID"><Input disabled={!isNew} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value.toUpperCase() })} /></F>
              <F label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></F>
              <F label="Min marks (%)"><Input type="number" value={editing.minMarks} onChange={(e) => setEditing({ ...editing, minMarks: +e.target.value })} /></F>
              <F label="Max income (₹)"><Input type="number" value={editing.maxIncome} onChange={(e) => setEditing({ ...editing, maxIncome: +e.target.value })} /></F>
              <F label="Seats"><Input type="number" min={0} value={editing.seats} onChange={(e) => setEditing({ ...editing, seats: +e.target.value })} /></F>
              <F label="Amount per award (₹)"><Input type="number" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: +e.target.value })} /></F>
              <F label="Total fund (₹)"><Input type="number" value={editing.totalFund} onChange={(e) => setEditing({ ...editing, totalFund: +e.target.value })} /></F>
              <F label="Branches (comma, blank = any)">
                <Input value={(editing.branches ?? []).join(",")} onChange={(e) => setEditing({ ...editing, branches: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </F>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Categories</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  {CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center gap-1.5"><Checkbox checked={editing.categories.includes(c)} onCheckedChange={() => setEditing({ ...editing, categories: toggle<Category>(editing.categories, c) })} />{c}</label>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Genders (none = any)</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  {GENDERS.map((g) => (
                    <label key={g} className="flex items-center gap-1.5"><Checkbox checked={!!editing.genders?.includes(g)} onCheckedChange={() => setEditing({ ...editing, genders: toggle<Gender>(editing.genders, g) })} />{g}</label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.requireRural} onCheckedChange={(v) => setEditing({ ...editing, requireRural: v })} /> Rural only</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.requireSports} onCheckedChange={(v) => setEditing({ ...editing, requireSports: v })} /> Sports quota only</label>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="sch-form" disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
