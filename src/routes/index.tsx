import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Armchair, GraduationCap, IndianRupee, Link2, Percent, Users, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/common";
import { useGraph, useRuns } from "@/hooks/use-data";
import { compactInr, fmtDate, inr } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ScholarAlloc" },
      { name: "description", content: "Overview of students, scholarships, funds and allocation runs in ScholarAlloc." },
      { property: "og:title", content: "Dashboard — ScholarAlloc" },
      { property: "og:description", content: "Overview of students, scholarships, funds and allocation runs." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" };

function Dashboard() {
  const graph = useGraph();
  const runs = useRuns();
  if (graph.isLoading) return <LoadingState />;
  if (graph.error || !graph.data) return <ErrorState error={graph.error} onRetry={() => graph.refetch()} />;
  const g = graph.data;
  const last = runs.data?.[0];
  const totalFund = g.scholarships.reduce((t, s) => t + s.totalFund, 0);
  const seats = g.scholarships.reduce((t, s) => t + s.seats, 0);
  const competition = g.scholarships.map((s) => ({ name: s.name.split(" ")[0], full: s.name, applicants: g.inDegree[s.id] ?? 0, seats: s.seats }));

  const byId = new Map(g.students.map((s) => [s.id, s]));
  const pie = CATEGORIES.map((c) => ({
    name: c,
    value: last
      ? last.allocations.filter((a) => byId.get(a.studentId)?.category === c).reduce((t, a) => t + a.amount, 0)
      : g.scholarships.reduce((t, s) => t + (s.categories.includes(c) ? s.totalFund / s.categories.length : 0), 0),
  })).filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        unit="SDG-4 · Quality Education"
        title="Scholarship allocation overview"
        subtitle="Limited funds, overlapping eligibility. See where competition is highest and how the last allocation performed."
        actions={
          <Button asChild>
            <Link to="/allocate"><Workflow className="h-4 w-4" /> Run allocation</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Students" value={g.students.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Scholarships" value={g.scholarships.length} icon={<GraduationCap className="h-4 w-4" />} tone="teal" />
        <StatCard label="Total fund" value={compactInr(totalFund)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Seats" value={seats} icon={<Armchair className="h-4 w-4" />} tone="teal" />
        <StatCard label="Eligible pairs" value={g.edges.length} hint="graph edges" icon={<Link2 className="h-4 w-4" />} />
        <StatCard label="Last utilisation" value={last ? `${last.utilisation}%` : "—"} hint={last?.algorithm ?? "no runs yet"} icon={<Percent className="h-4 w-4" />} tone="teal" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="p-4 shadow-card lg:col-span-3">
          <h2 className="text-base font-semibold">Competition per scholarship</h2>
          <p className="mb-3 text-xs text-muted-foreground">Eligible applicants (in-degree) versus available seats</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={competition}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload.full} />
                <Legend />
                <Bar dataKey="applicants" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="seats" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold">Fund by category</h2>
          <p className="mb-3 text-xs text-muted-foreground">{last ? `Awarded in ${last.runId}` : "Available fund split across allowed categories"}</p>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent allocation runs</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/reports">View all</Link></Button>
        </div>
        {!runs.data?.length ? (
          <EmptyState title="No runs yet" hint="Run the Allocation Engine to see results here." />
        ) : (
          <div className="divide-y">
            {runs.data.slice(0, 5).map((r) => (
              <div key={r.runId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <Badge variant="secondary">{r.algorithm}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{r.runId}</span>
                <span className="text-muted-foreground">{fmtDate(r.createdAt)}</span>
                <span className="ml-auto font-medium">{r.seatsFilled} awarded · {inr(r.fundsUsed)} · {r.utilisation}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
