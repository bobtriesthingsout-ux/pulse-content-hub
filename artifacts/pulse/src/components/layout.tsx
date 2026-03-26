import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, MessageSquare, Settings, Youtube, 
  Mic, Mail, BookOpen, PauseCircle, ChevronRight 
} from "lucide-react";
import { 
  Sidebar, SidebarProvider, SidebarContent, SidebarGroup, 
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, 
  SidebarMenuItem, SidebarMenuButton, SidebarMenuSub,
  SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useData, SourceType } from "@/lib/data";

export function SourceIcon({ type, className }: { type: SourceType; className?: string }) {
  switch (type) {
    case "youtube": return <Youtube className={className} />;
    case "podcast": return <Mic className={className} />;
    case "newsletter": return <Mail className={className} />;
    case "blog": return <BookOpen className={className} />;
  }
}

export function AppSidebar() {
  const [location] = useLocation();
  const { sources } = useData();

  const getSourcesByType = (type: SourceType) => sources.filter(s => s.type === type);

  const sections: { title: string; type: SourceType; icon: React.ElementType }[] = [
    { title: "YouTube", type: "youtube", icon: Youtube },
    { title: "Podcasts", type: "podcast", icon: Mic },
    { title: "Newsletters", type: "newsletter", icon: Mail },
    { title: "Blogs / Substack", type: "blog", icon: BookOpen },
  ];

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-foreground">Pulse</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/">
                    <Home className="w-4 h-4" />
                    <span>Daily Feed</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/chat"}>
                  <Link href="/chat">
                    <MessageSquare className="w-4 h-4" />
                    <span>AI Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/manage"}>
                  <Link href="/manage">
                    <Settings className="w-4 h-4" />
                    <span>Manage Sources</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const sectionSources = getSourcesByType(section.type);
                if (sectionSources.length === 0) return null;
                
                return (
                  <Collapsible key={section.type} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <section.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{section.title}</span>
                          <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sectionSources.map((source) => {
                            const isPaused = source.status === "paused";
                            return (
                              <SidebarMenuSubItem key={source.id}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={location === `/source/${source.id}`}
                                  className={isPaused ? "opacity-50" : ""}
                                >
                                  <Link href={`/source/${source.id}`} className="flex items-center w-full">
                                    <span className="truncate flex-1">{source.name}</span>
                                    {isPaused && <PauseCircle className="w-3.5 h-3.5 ml-2 shrink-0" />}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
