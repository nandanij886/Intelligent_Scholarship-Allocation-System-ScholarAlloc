import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ScholarAlloc" },
      { name: "description", content: "Reports in ScholarAlloc." },
      { property: "og:title", content: "Reports — ScholarAlloc" },
      { property: "og:description", content: "Reports in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Reports" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
