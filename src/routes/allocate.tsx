import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/allocate")({
  head: () => ({
    meta: [
      { title: "Allocation Engine — ScholarAlloc" },
      { name: "description", content: "Allocation Engine in ScholarAlloc." },
      { property: "og:title", content: "Allocation Engine — ScholarAlloc" },
      { property: "og:description", content: "Allocation Engine in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Allocation Engine" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
