import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — ScholarAlloc" },
      { name: "description", content: "Students in ScholarAlloc." },
      { property: "og:title", content: "Students — ScholarAlloc" },
      { property: "og:description", content: "Students in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Students" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
