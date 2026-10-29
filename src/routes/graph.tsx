import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Graph Explorer — ScholarAlloc" },
      { name: "description", content: "Graph Explorer in ScholarAlloc." },
      { property: "og:title", content: "Graph Explorer — ScholarAlloc" },
      { property: "og:description", content: "Graph Explorer in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Graph Explorer" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
