import { useEffect, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Metric } from "@/components/common";
import { compactInr, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AllocStep, AllocationResult, Scholarship, Student } from "@/lib/types";

export function ResultMetrics({ r }: { r: AllocationResult }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      <Metric label="Total priority" value={r.totalPriority.toFixed(1)} />
      <Metric label="Funds used" value={compactInr(r.fundsUsed)} />
      <Metric label="Seats filled" value={r.seatsFilled} />
      <Metric label="Utilisation" value={`${r.utilisation.toFixed(1)}%`} />
      <Metric label="Nodes explored" value={r.nodesExplored.toLocaleString()} />
      <Metric label="Nodes pruned" value={r.nodesPruned.toLocaleString()} />
      <Metric label="Time" value={`${r.timeMs.toFixed(2)} ms`} />
    </div>
  );
}

export function AllocationTables({ r, students, scholarships }: { r: AllocationResult; students: Student[]; scholarships: Scholarship[] }) {
  const sn = (id: string) => students.find((s) => s.id === id)?.name ?? id;
  const sc = (id: string) => scholarships.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card className="p-4">
        <h3 className="mb-2 font-semibold text-foreground">Allocations ({r.allocations.length})</h3>
        <div className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Scholarship</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...r.allocations].sort((a, b) => b.score - a.score).map((a) => (
                <TableRow key={a.studentId}>
                  <TableCell><span className="font-mono text-xs text-muted-foreground">{a.studentId}</span> {sn(a.studentId)}</TableCell>
                  <TableCell>{sc(a.scholarshipId)}</TableCell>
                  <TableCell className="text-right">{inr(a.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{a.score.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-2 font-semibold text-foreground">Unallocated ({r.unallocated.length})</h3>
        <ul className="max-h-[420px] space-y-1.5 overflow-auto text-sm">
          {r.unallocated.map((u) => (
            <li key={u.studentId}><span className="font-medium text-foreground">{sn(u.studentId)}</span> <span className="text-muted-foreground">— {u.reason}</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function Playback({ r }: { r: AllocationResult }) {
  const steps = r.steps;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setIdx(0); setPlaying(false); }, [r.runId]);
  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setIdx((i) => i + 1), r.algorithm === "PQ" ? 350 : 120);
    return () => clearTimeout(t);
  }, [playing, idx, steps.length, r.algorithm]);
  if (!steps.length) return null;
  const shown = steps.slice(0, idx + 1);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-semibold text-foreground">
          Step-by-step playback · {r.algorithm === "PQ" ? "heap pops" : r.algorithm === "DP" ? "DP table filling" : "state-space tree"}
        </h3>
        <Button size="sm" variant="outline" onClick={() => (idx >= steps.length - 1 && setIdx(0), setPlaying((p) => !p))}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}><SkipForward className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => setIdx(steps.length - 1)}>End</Button>
        <span className="font-mono text-xs text-muted-foreground">{idx + 1}/{steps.length}</span>
      </div>
      {r.algorithm === "PQ" && <HeapView steps={shown.filter((s): s is Extract<AllocStep, { kind: "heap" }> => s.kind === "heap")} />}
      {r.algorithm === "DP" && <DpView steps={shown.filter((s): s is Extract<AllocStep, { kind: "dp" }> => s.kind === "dp")} caps={r.dpCapacities ?? []} />}
      {(r.algorithm === "BACKTRACK" || r.algorithm === "BNB") && <TreeView steps={shown.filter((s): s is Extract<AllocStep, { kind: "tree" }> => s.kind === "tree")} />}
      {r.note && <p className="mt-3 text-xs text-muted-foreground">{r.note}</p>}
    </Card>
  );
}

function HeapView({ steps }: { steps: Extract<AllocStep, { kind: "heap" }>[] }) {
  return (
    <ol className="max-h-80 space-y-1 overflow-auto font-mono text-xs">
      {steps.map((s, i) => (
        <li key={i} className={cn("rounded px-2 py-1", s.action === "assigned" ? "bg-accent text-accent-foreground" : "text-muted-foreground", i === steps.length - 1 && "ring-1 ring-primary")}>
          pop #{i + 1} · {s.studentId} → {s.scholarshipId} · score {s.score.toFixed(1)} · <b>{s.action}</b> · {s.reason} · heap {s.heapSize}
        </li>
      ))}
    </ol>
  );
}

function DpView({ steps, caps }: { steps: Extract<AllocStep, { kind: "dp" }>[]; caps: number[] }) {
  const cols = steps[0]?.values.length ?? caps.length;
  return (
    <div className="max-h-96 overflow-auto">
      <table className="font-mono text-[10px]">
        <thead>
          <tr><th className="px-1 text-left text-muted-foreground">item \ cap</th>{Array.from({ length: cols }, (_, j) => <th key={j} className="px-1 text-muted-foreground">{caps[j] !== undefined ? compactInr(caps[j]) : j}</th>)}</tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i} className={i === steps.length - 1 ? "bg-accent" : ""}>
              <td className="pr-2 text-muted-foreground">{s.row}. {s.studentId}</td>
              {s.values.map((v, j) => {
                const changed = i > 0 && steps[i - 1].values[j] !== v;
                return <td key={j} className={cn("px-1 text-right", changed ? "font-bold text-teal" : "text-foreground")}>{v.toFixed(0)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TreeView({ steps }: { steps: Extract<AllocStep, { kind: "tree" }>[] }) {
  const counts = { explored: 0, pruned: 0, solution: 0 };
  steps.forEach((s) => counts[s.status]++);
  const last = steps.slice(-80);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">explored {counts.explored}</Badge>
        <Badge variant="outline" className="border-destructive text-destructive">pruned {counts.pruned}</Badge>
        <Badge variant="outline" className="border-teal text-teal">new best {counts.solution}</Badge>
        <span className="text-muted-foreground">showing the latest {last.length} nodes</span>
      </div>
      <div className="max-h-80 overflow-auto font-mono text-xs">
        {last.map((s) => (
          <div key={s.id} style={{ paddingLeft: Math.min(s.depth, 30) * 10 }}
            className={cn(s.status === "pruned" ? "text-destructive" : s.status === "solution" ? "font-semibold text-teal" : "text-muted-foreground")}>
            {s.status === "pruned" ? "✂ " : s.status === "solution" ? "★ " : "• "}#{s.id} {s.label} · value {s.value.toFixed(1)}
          </div>
        ))}
      </div>
    </div>
  );
}
