import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3, BookOpen, FileText, FlaskConical, GitBranch, GraduationCap, LayoutDashboard, Network, Scale, Settings, Users, Workflow,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useSettings } from "@/lib/settings";

const groups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Students", url: "/students", icon: Users },
      { title: "Scholarships", url: "/scholarships", icon: GraduationCap },
    ],
  },
  {
    label: "Explore",
    items: [
      { title: "Eligibility Tree", url: "/tree", icon: GitBranch },
      { title: "Graph Explorer", url: "/graph", icon: Network },
    ],
  },
  {
    label: "Allocate",
    items: [
      { title: "Allocation Engine", url: "/allocate", icon: Workflow },
      { title: "Compare", url: "/compare", icon: BarChart3 },
      { title: "What-If Simulator", url: "/what-if", icon: FlaskConical },
      { title: "Reports", url: "/reports", icon: FileText },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "Algorithms", url: "/algorithms", icon: BookOpen },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
] as const;

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { mockMode } = useSettings();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-1 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-base font-semibold text-sidebar-accent-foreground">ScholarAlloc</div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-primary">SDG-4 · Quality Education</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                      <Link to={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-md bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground">
            <span className={mockMode ? "text-sidebar-primary" : "text-warning"}>●</span> {mockMode ? "Mock mode (in-browser)" : "Live API"}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
