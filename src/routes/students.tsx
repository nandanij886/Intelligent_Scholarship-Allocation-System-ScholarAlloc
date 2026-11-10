import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { useEnvKey, useInvalidateAll, useStudents, useWeights } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { binarySearchById, HashMap, priorityScore, Trie } from "@/lib/dsa";
import { downloadCsv, inr, parseCsv } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { CATEGORIES, GENDERS, type Category, type Gender, type SortAlgo, type SortKey, type Student } from "@/lib/types";

export const Route = createFileRoute("/students")({
  head: () => pageMeta("Students", "Manage students, search with a Trie, look up by ID and sort with merge, quick or heap sort."),
  component: StudentsPage,
});

const blank = (): Student => ({ id: "", name: "", marks: 75, income: 300000, category: "General", gender: "Female", branch: "CSE" });

function StudentsPage() {
  const { data, isLoading, error, refetch } = useStudents();
  const { data: weights } = useWeights();
  const env = useEnvKey();
  const invalidate = useInvalidateAll();
  const [q, setQ] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [algo, setAlgo] = useState<SortAlgo>("merge");
  const [editing, setEditing] = useState<Student | null>(null);
  const [isNew, setIsNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useQuery({
    queryKey: [...env, "sorted", sortBy, algo, weights, data?.length],
    queryFn: () => api.sortedStudents(sortBy, algo, weights!),
    enabled: !!weights && !!data,
  });

  const trie = useMemo(() => {
    const t = new Trie();
    data?.forEach((s) => t.insert(s.name, s.id));
    return t;
  }, [data]);
  const map = useMemo(() => {
    const m = new HashMap<Student>();
    data?.forEach((s) => m.set(s.id, s));
    return m;
  }, [data]);

  const matchIds = q ? new Set(trie.search(q)) : null;
  const rows = (sorted.data?.items ?? data ?? []).filter((s) => !matchIds || matchIds.has(s.id));
  const suggestions = q ? (data ?? []).filter((s) => matchIds?.has(s.id)).slice(0, 6) : [];
  const found = lookupId ? map.get(lookupId.trim().toUpperCase()) ?? map.get(lookupId.trim()) : undefined;
  const bs = useMemo(() => {
    if (!lookupId || !data) return null;
    const ids = data.map((s) => s.id).sort();
    return binarySearchById(ids, lookupId.trim().toUpperCase());
  }, [lookupId, data]);

  const save = useMutation({
    mutationFn: (s: Student) => (isNew ? api.createStudent(s) : api.updateStudent(s)),
    onSuccess: () => (toast.success("Student saved"), setEditing(null), invalidate()),
  });
  const del = useMutation({ mutationFn: api.deleteStudent, onSuccess: () => (toast.success("Student deleted"), invalidate()) });

  async function onImport(f: File) {
    const r = parseCsv(await f.text());
    const [h, ...body] = r;
    const idx = (k: string) => h.findIndex((c) => c.trim().toLowerCase() === k.toLowerCase());
    const items: Student[] = body.map((c) => ({
      id: c[idx("id")], name: c[idx("name")], marks: +c[idx("marks")], income: +c[idx("income")],
      category: (c[idx("category")] || "General") as Category, gender: (c[idx("gender")] || "Other") as Gender,
      branch: c[idx("branch")] || "CSE", rural: c[idx("rural")] === "true", sportsQuota: c[idx("sportsQuota")] === "true",
    })).filter((s) => s.id && s.name);
    await api.importStudents(items);
    toast.success(`Imported ${items.length} students`);
    invalidate();
  }

  const exportCsv = () =>
    downloadCsv("students.csv", [
      ["id", "name", "marks", "income", "category", "gender", "branch", "rural", "sportsQuota"],
      ...(data ?? []).map((s) => [s.id, s.name, s.marks, s.income, s.category, s.gender, s.branch, !!s.rural, !!s.sportsQuota]),
    ]);

  return (
    <div>
      <PageHeader
        unit="Arrays · Trie · HashMap · Sorting"
        title="Students"
        subtitle="Add, edit and import applicants. Search uses a Trie, ID lookup uses a hash map."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button size="sm" onClick={() => (setIsNew(true), setEditing(blank()))}><Plus className="h-4 w-4" /> Add student</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <Label className="text-xs uppercase text-muted-foreground">Prefix search (Trie)</Label>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Type a name, e.g. Pri" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => setQ(s.name)}>{s.name}</Badge>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <Label className="text-xs uppercase text-muted-foreground">Exact lookup by ID (HashMap, O(1))</Label>
          <Input className="mt-2" placeholder="e.g. S005" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
          {lookupId && (
            <div className="mt-2 text-sm">
              {found ? <span className="text-foreground"><b>{found.name}</b> · {found.marks}% · {inr(found.income)}</span> : <span className="text-muted-foreground">No student with that ID.</span>}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <Label className="text-xs uppercase text-muted-foreground">Binary search by ID (sorted IDs)</Label>
          {!bs ? (
            <p className="mt-2 text-sm text-muted-foreground">Type an ID in the lookup box to see the steps.</p>
          ) : (
            <ol className="mt-2 space-y-1 font-mono text-xs">
              {bs.steps.map((s, i) => (
                <li key={i} className={s.cmp === "found" ? "font-semibold text-teal" : "text-muted-foreground"}>
                  {i + 1}. lo={s.lo} hi={s.hi} mid={s.mid} ({s.midId}) → {s.cmp}
                </li>
              ))}
              {bs.index < 0 && <li className="text-destructive">Not found after {bs.steps.length} steps</li>}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="marks">Marks</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">using</span>
          <Select value={algo} onValueChange={(v) => setAlgo(v as SortAlgo)}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">Merge Sort</SelectItem>
              <SelectItem value="quick">Quick Sort</SelectItem>
              <SelectItem value="heap">Heap Sort</SelectItem>
            </SelectContent>
          </Select>
          {sorted.data && (
            <Badge variant="outline" className="font-mono">
              {algo} · {sorted.data.comparisons} comparisons · {sorted.data.timeMs.toFixed(3)} ms
            </Badge>
          )}
        </div>
        {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
          <EmptyState title="No students" hint={q ? "No names start with that text." : "Add a student or import a CSV."} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Income</TableHead><TableHead>Category</TableHead><TableHead>Gender</TableHead>
                  <TableHead>Branch</TableHead><TableHead className="text-right">Priority</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.marks}</TableCell>
                    <TableCell className="text-right">{inr(s.income)}</TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.gender}</TableCell>
                    <TableCell>{s.branch}</TableCell>
                    <TableCell className="text-right font-mono">{weights ? priorityScore(s, weights).toFixed(1) : "—"}</TableCell>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Add student" : "Edit student"}</DialogTitle></DialogHeader>
          {editing && (
            <form
              id="student-form"
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.id || !editing.name) { toast.error("ID and name are required"); return; }
                if (isNew && map.get(editing.id)) { toast.error("That ID already exists"); return; }
                save.mutate(editing);
              }}
            >
              <F label="ID"><Input disabled={!isNew} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value.toUpperCase() })} /></F>
              <F label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></F>
              <F label="Marks (%)"><Input type="number" min={0} max={100} value={editing.marks} onChange={(e) => setEditing({ ...editing, marks: +e.target.value })} /></F>
              <F label="Family income (₹)"><Input type="number" min={0} value={editing.income} onChange={(e) => setEditing({ ...editing, income: +e.target.value })} /></F>
              <F label="Category">
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Gender">
                <Select value={editing.gender} onValueChange={(v) => setEditing({ ...editing, gender: v as Gender })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GENDERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Branch"><Input value={editing.branch} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} /></F>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2"><Switch checked={!!editing.rural} onCheckedChange={(v) => setEditing({ ...editing, rural: v })} /> Rural</label>
                <label className="flex items-center gap-2"><Switch checked={!!editing.sportsQuota} onCheckedChange={(v) => setEditing({ ...editing, sportsQuota: v })} /> Sports quota</label>
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="student-form" disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
