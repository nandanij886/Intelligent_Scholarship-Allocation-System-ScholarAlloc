import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/what-if")({
  head: () => ({
    meta: [
      { title: "What-If Simulator — ScholarAlloc" },
      { name: "description", content: "What-If Simulator in ScholarAlloc." },
      { property: "og:title", content: "What-If Simulator — ScholarAlloc" },
      { property: "og:description", content: "What-If Simulator in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="What-If Simulator" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
