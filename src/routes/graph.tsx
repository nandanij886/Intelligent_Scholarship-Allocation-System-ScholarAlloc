import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { useGraph } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { adjacency } from "@/lib/dsa";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { TraversalResponse } from "@/lib/types";

export const Route = createFileRoute("/graph")({
  head: () => pageMeta("Graph Explorer", "Bipartite student–scholarship eligibility graph with BFS, DFS, adjacency list/matrix and connected components."),
  component: GraphPage,
});

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)", "var(--warning)"];

function GraphPage() {
  const { data: g, isLoading, error, refetch } = useGraph();
  const [start, setStart] = useState("");
  const [mode, setMode] = useState<"bfs" | "dfs">("bfs");
  const [trav, setTrav] = useState<TraversalResponse | null>(null);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [comps, setComps] = useState<string[][] | null>(null);
  const [matrix, setMatrix] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => { if (!start && g?.students[0]) setStart(g.students[0].id); }, [g, start]);
  useEffect(() => {
    if (!playing || !trav) return;
    if (idx >= trav.steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setIdx((i) => i + 1), 450);
    return () => clearTimeout(t);
  }, [playing, idx, trav]);

  const adj = useMemo(() => (g ? adjacency(g.edges) : new Map<string, string[]>()), [g]);
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!g || (!g.students.length && !g.scholarships.length)) return <EmptyState title="No data to draw a graph" />;

  const rowH = 24, W = 560, top = 20;
  const H = Math.max(g.students.length, g.scholarships.length) * rowH + top * 2;
  const sGap = (H - top * 2) / Math.max(1, g.scholarships.length);
  const pos = new Map<string, { x: number; y: number }>();
  g.students.forEach((s, i) => pos.set(s.id, { x: 90, y: top + i * rowH + rowH / 2 }));
  g.scholarships.forEach((s, i) => pos.set(s.id, { x: W - 110, y: top + i * sGap + sGap / 2 }));

  const step = trav?.steps[idx];
  const visited = new Set(step?.visited ?? []);
  const frontier = new Set(step?.frontier ?? []);
  const compOf = new Map<string, number>();
  comps?.forEach((c, i) => c.forEach((id) => compOf.set(id, i)));
  const nodeColor = (id: string) => {
    if (step?.current === id) return "var(--warning)";
    if (visited.has(id)) return "var(--teal)";
    if (frontier.has(id)) return "var(--chart-3)";
    if (comps) return PALETTE[(compOf.get(id) ?? 0) % PALETTE.length];
    return id.startsWith("S") && g.students.some((s) => s.id === id) ? "var(--chart-1)" : "var(--chart-2)";
  };
  const competing = focus ? g.edges.filter((e) => e.scholarshipId === focus).map((e) => g.students.find((s) => s.id === e.studentId)!) : [];
  const nameOf = (id: string) => g.students.find((s) => s.id === id)?.name ?? g.scholarships.find((s) => s.id === id)?.name ?? id;
  const sparsity = 1 - g.edges.length / Math.max(1, g.students.length * g.scholarships.length);

  async function run(m: "bfs" | "dfs") {
    setMode(m);
    setComps(null);
    const r = await api.traverse(start, m);
    setTrav(r);
    setIdx(0);
    setPlaying(true);
  }

  return (
    <div>
      <PageHeader unit="Unit 2 · Graphs" title="Graph Explorer" subtitle="Students on the left, scholarships on the right, an edge wherever a student is eligible." />
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm text-muted-foreground">Start node</span>
        <Select value={start} onValueChange={setStart}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {g.students.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>)}
            {g.scholarships.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => run("bfs")}>Run BFS</Button>
        <Button size="sm" onClick={() => run("dfs")}>Run DFS</Button>
        {trav && (
          <>
            <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button size="sm" variant="outline" onClick={() => setIdx((i) => Math.min(i + 1, trav.steps.length - 1))}><SkipForward className="h-4 w-4" /></Button>
          </>
        )}
        <Button size="sm" variant="secondary" onClick={async () => (setTrav(null), setIdx(-1), setComps((await api.components()).components))}>Connected components</Button>
        {comps && <Badge variant="outline">{comps.length} components</Badge>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label="Bipartite eligibility graph">
            {g.edges.map((e, i) => {
              const a = pos.get(e.studentId)!, b = pos.get(e.scholarshipId)!;
              const hot = focus === e.scholarshipId || (visited.has(e.studentId) && visited.has(e.scholarshipId));
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? "var(--teal)" : "var(--border)"} strokeWidth={hot ? 1.6 : 0.8} />;
            })}
            {g.students.map((s) => {
              const p = pos.get(s.id)!;
              return (
                <g key={s.id}>
                  <text x={p.x - 10} y={p.y + 3} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">{s.id} ({g.outDegree[s.id]})</text>
                  <circle cx={p.x} cy={p.y} r={6} fill={nodeColor(s.id)} />
                </g>
              );
            })}
            {g.scholarships.map((s) => {
              const p = pos.get(s.id)!;
              return (
                <g key={s.id} className="cursor-pointer" onClick={() => setFocus(focus === s.id ? null : s.id)}>
                  <rect x={p.x - 8} y={p.y - 8} width={16} height={16} rx={3} fill={nodeColor(s.id)} stroke={focus === s.id ? "var(--foreground)" : "none"} strokeWidth={2} />
                  <text x={p.x + 14} y={p.y + 3} fontSize={10} fill="var(--foreground)">{s.id} · in {g.inDegree[s.id]}</text>
                </g>
              );
            })}
          </svg>
          <p className="px-2 pb-2 text-xs text-muted-foreground">Numbers next to students are out-degree. Click a scholarship square to list competing students.</p>
        </Card>

        <div className="space-y-4">
          {trav && step && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-foreground">{mode.toUpperCase()} · step {idx + 1}/{trav.steps.length}</h2>
              <div className="text-sm">Current: <b>{step.current}</b></div>
              <div className="mt-2 text-xs uppercase text-muted-foreground">{mode === "bfs" ? "Queue (front → back)" : "Stack (bottom → top)"}</div>
              <div className="mt-1 flex flex-wrap gap-1">{step.frontier.length ? step.frontier.map((f, i) => <Badge key={i} variant="outline" className="font-mono">{f}</Badge>) : <span className="text-xs text-muted-foreground">empty</span>}</div>
              <div className="mt-2 text-xs uppercase text-muted-foreground">Visit order</div>
              <div className="mt-1 font-mono text-xs text-foreground">{step.visited.join(" → ")}</div>
            </Card>
          )}
          {focus && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-foreground">{nameOf(focus)} — {competing.length} competing</h2>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">{competing.map((s) => <li key={s.id}>{s.id} · {s.name} · {s.marks}%</li>)}</ul>
            </Card>
          )}
          {comps && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-foreground">Components</h2>
              <ul className="space-y-1 text-xs">
                {comps.map((c, i) => (
                  <li key={i} className="flex gap-2"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="font-mono">{c.join(", ")}</span></li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{matrix ? "Adjacency matrix" : "Adjacency list"}</h2>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">Matrix <Switch checked={matrix} onCheckedChange={setMatrix} /></label>
            </div>
            {matrix ? (
              <>
                <div className="mb-2 text-xs text-muted-foreground">{g.edges.length} edges of {g.students.length * g.scholarships.length} cells · sparsity <b>{(sparsity * 100).toFixed(1)}%</b></div>
                <div className="max-h-96 overflow-auto">
                  <table className="font-mono text-[10px]">
                    <thead><tr><th />{g.scholarships.map((s) => <th key={s.id} className="px-1 text-muted-foreground">{s.id}</th>)}</tr></thead>
                    <tbody>
                      {g.students.map((st) => (
                        <tr key={st.id}>
                          <td className="pr-1 text-muted-foreground">{st.id}</td>
                          {g.scholarships.map((s) => {
                            const on = adj.get(st.id)?.includes(s.id);
                            return <td key={s.id} className={cn("px-1 text-center", on ? "bg-accent text-accent-foreground" : "text-muted-foreground/50")}>{on ? 1 : 0}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <ul className="max-h-96 space-y-0.5 overflow-y-auto font-mono text-xs">
                {[...g.students, ...g.scholarships].map((n) => (
                  <li key={n.id}><span className="font-semibold text-foreground">{n.id}</span> → <span className="text-muted-foreground">{(adj.get(n.id) ?? []).join(", ") || "∅"}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
