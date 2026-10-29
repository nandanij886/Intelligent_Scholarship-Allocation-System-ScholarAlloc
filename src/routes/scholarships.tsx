import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/scholarships")({
  head: () => ({
    meta: [
      { title: "Scholarships — ScholarAlloc" },
      { name: "description", content: "Scholarships in ScholarAlloc." },
      { property: "og:title", content: "Scholarships — ScholarAlloc" },
      { property: "og:description", content: "Scholarships in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Scholarships" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
