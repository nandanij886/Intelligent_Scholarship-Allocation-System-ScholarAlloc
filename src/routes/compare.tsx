import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/common";
import { useScholarships, useStudents, useWeights } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { compactInr } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { ALGORITHMS, CATEGORIES, GENDERS, type AllocationResult, type Student } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => pageMeta("Compare Algorithms", "Run all four allocation algorithms side by side and check fairness by category and gender."),
  component: ComparePage,
});

const short = (id: string) => ALGORITHMS.find((a) => a.id === id)?.short ?? id;

function ComparePage() {
  const students = useStudents();
  const schs = useScholarships();
  const w = useWeights();
  const [res, setRes] = useState<AllocationResult[] | null>(null);
  const budget = schs.data?.reduce((a, s) => a + s.totalFund, 0) ?? 0;
  const run = useMutation({ mutationFn: () => api.compare({ budget, weights: w.data! }), onSuccess: setRes });

  const best = res ? res.reduce((a, b) => (b.totalPriority > a.totalPriority ? b : a)) : null;
  const pq = res?.find((r) => r.algorithm === "PQ");
  const dp = res?.find((r) => r.algorithm === "DP");
  const chart = res?.map((r) => ({ name: short(r.algorithm), priority: +r.totalPriority.toFixed(1), utilisation: +r.utilisation.toFixed(1), time: +r.timeMs.toFixed(2), nodes: r.nodesExplored }));

  return (
    <div>
      <PageHeader
        unit="Benchmark"
        title="Compare Algorithms"
        subtitle={`Same students, same budget (${compactInr(budget)}), same weights — four algorithms.`}
        actions={<Button onClick={() => run.mutate()} disabled={run.isPending || !w.data}>{run.isPending ? "Running…" : "Run all four"}</Button>}
      />
      {!res ? <EmptyState title="No comparison yet" hint="Press “Run all four” to benchmark the algorithms." /> : (
        <div className="space-y-4">
          <Card className="overflow-x-auto p-4">
            <Table>
              <TableHeader><TableRow><TableHead>Algorithm</TableHead><TableHead className="text-right">Total priority</TableHead><TableHead className="text-right">Seats</TableHead><TableHead className="text-right">Funds used</TableHead><TableHead className="text-right">Utilisation</TableHead><TableHead className="text-right">Nodes explored</TableHead><TableHead className="text-right">Pruned</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {res.map((r) => (
                  <TableRow key={r.algorithm} className={cn(r === best && "bg-accent/60")}>
                    <TableCell className="font-medium">{r === best && <Trophy className="mr-1 inline h-4 w-4 text-teal" />}{short(r.algorithm)}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalPriority.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{r.seatsFilled}</TableCell>
                    <TableCell className="text-right">{compactInr(r.fundsUsed)}</TableCell>
                    <TableCell className="text-right">{r.utilisation.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{r.nodesExplored.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.nodesPruned.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.timeMs.toFixed(2)} ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {pq && dp && best && (
            <Card className="border-teal/40 p-4 text-sm text-foreground">
              <b>{short(best.algorithm)}</b> gives the highest total priority ({best.totalPriority.toFixed(1)}).{" "}
              {dp.totalPriority > pq.totalPriority
                ? `Greedy picks the single best student first, which can use up an expensive award and block two cheaper ones that together score more. DP considers every budget level, so it scores ${(dp.totalPriority - pq.totalPriority).toFixed(1)} points more and fills ${dp.seatsFilled} seats versus ${pq.seatsFilled}.`
                : "Here greedy matches DP — the data has no case where an early greedy pick blocks a better combination."}
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {([["priority", "Total priority"], ["utilisation", "Utilisation %"], ["time", "Time (ms)"], ["nodes", "Nodes explored"]] as const).map(([k, label], i) => (
              <Card key={k} className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">{label}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    <Bar dataKey={k} fill={`var(--chart-${(i % 5) + 1})`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </div>
          {best && students.data && <Fairness r={best} students={students.data} />}
        </div>
      )}
    </div>
  );
}

function Fairness({ r, students }: { r: AllocationResult; students: Student[] }) {
  const awarded = new Set(r.allocations.map((a) => a.studentId));
  const won = students.filter((s) => awarded.has(s.id));
  const share = <K extends keyof Student>(key: K, vals: readonly string[]) =>
    vals.map((v) => ({
      name: v,
      applicants: +((100 * students.filter((s) => s[key] === v).length) / Math.max(1, students.length)).toFixed(1),
      awarded: +((100 * won.filter((s) => s[key] === v).length) / Math.max(1, won.length)).toFixed(1),
    }));
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-semibold text-foreground">Fairness — {short(r.algorithm)}</h3>
      <p className="mb-3 text-xs text-muted-foreground">Share of awards versus share of applicants (%). Bars close together mean proportional representation.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {([["By category", share("category", CATEGORIES)], ["By gender", share("gender", GENDERS)]] as const).map(([t, d]) => (
          <div key={t}>
            <div className="mb-1 text-sm font-medium text-foreground">{t}</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Legend />
                <Bar dataKey="applicants" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="awarded" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </Card>
  );
}
