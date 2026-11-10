import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { AllocationTables, ResultMetrics } from "@/components/alloc-view";
import { useEnvKey, useRuns, useScholarships, useStudents } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { compactInr, downloadCsv, fmtDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => pageMeta("Reports", "Allocation run history, CSV and print-friendly PDF export, and an audit log of every action."),
  component: ReportsPage,
});

function ReportsPage() {
  const runs = useRuns();
  const students = useStudents();
  const schs = useScholarships();
  const env = useEnvKey();
  const audit = useQuery({ queryKey: [...env, "audit"], queryFn: api.audit });
  const [sel, setSel] = useState<string | null>(null);
  const run = runs.data?.find((r) => r.runId === sel) ?? runs.data?.[0];
  const sn = (id: string) => students.data?.find((s) => s.id === id)?.name ?? id;
  const sc = (id: string) => schs.data?.find((s) => s.id === id)?.name ?? id;

  const exportCsv = () => run && downloadCsv(`allocation-${run.runId}.csv`, [
    ["runId", "algorithm", "studentId", "studentName", "scholarshipId", "scholarshipName", "amount", "score"],
    ...run.allocations.map((a) => [run.runId, run.algorithm, a.studentId, sn(a.studentId), a.scholarshipId, sc(a.scholarshipId), a.amount, a.score]),
    ...run.unallocated.map((u) => [run.runId, run.algorithm, u.studentId, sn(u.studentId), "", "UNALLOCATED: " + u.reason, 0, ""]),
  ]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Every allocation run is kept here with its full result." actions={run && (
        <>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / PDF</Button>
        </>
      )} />
      <Tabs defaultValue="runs">
        <TabsList className="no-print mb-4"><TabsTrigger value="runs">Allocation history</TabsTrigger><TabsTrigger value="audit">Audit log</TabsTrigger></TabsList>
        <TabsContent value="runs">
          {runs.isLoading ? <LoadingState /> : runs.error ? <ErrorState error={runs.error} onRetry={runs.refetch} /> : !runs.data?.length ? (
            <EmptyState title="No runs yet" hint="Run an allocation to see it here." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card className="no-print h-fit max-h-[70vh] overflow-auto p-2">
                {runs.data.map((r) => (
                  <button key={r.runId} onClick={() => setSel(r.runId)} className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted", r.runId === run?.runId && "bg-secondary")}>
                    <div className="font-medium text-foreground">{r.algorithm} · {r.totalPriority.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(r.createdAt)} · {compactInr(r.budget)}</div>
                  </button>
                ))}
              </Card>
              {run && (
                <div className="print-area space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">ScholarAlloc report — {run.algorithm}</h2>
                    <p className="text-xs text-muted-foreground">Run {run.runId} · {fmtDate(run.createdAt)} · budget {compactInr(run.budget)} · weights merit {run.weights.merit} / need {run.weights.need} / category {run.weights.category}</p>
                  </div>
                  <ResultMetrics r={run} />
                  <AllocationTables r={run} students={students.data ?? []} scholarships={schs.data ?? []} />
                </div>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="audit">
          <Card className="overflow-x-auto p-4">
            {!audit.data?.length ? <EmptyState title="Audit log is empty" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Parameters</TableHead></TableRow></TableHeader>
                <TableBody>
                  {audit.data.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(a.at)}</TableCell>
                      <TableCell className="text-xs">{a.actor}</TableCell>
                      <TableCell className="font-medium">{a.action}</TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground" title={a.params}>{a.params}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
