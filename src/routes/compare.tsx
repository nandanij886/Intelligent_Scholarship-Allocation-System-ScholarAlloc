import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare — ScholarAlloc" },
      { name: "description", content: "Compare in ScholarAlloc." },
      { property: "og:title", content: "Compare — ScholarAlloc" },
      { property: "og:description", content: "Compare in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Compare" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
