import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ChevronUp,
  DollarSign,
  Download,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PanelLeft,
  Settings,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuGroups = [
  {
    label: "Dashboards",
    items: [
      { icon: LayoutDashboard, label: "Início", path: "/" },
      { icon: DollarSign, label: "Vendas", path: "/vendas" },
      { icon: TrendingUp, label: "Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: Users, label: "Representantes", path: "/representantes" },
      { icon: Building2, label: "Clientes", path: "/clientes" },
      { icon: Briefcase, label: "Oportunidades", path: "/oportunidades" },
      { icon: Target, label: "Metas", path: "/metas" },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { icon: Map, label: "Mapa", path: "/mapa" },
      { icon: Download, label: "Importar", path: "/importacao" },
      { icon: Settings, label: "Preferências", path: "/preferencias" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: notifData } = trpc.notifications.list.useQuery({ unreadOnly: true }, {
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.filter(n => !n.isRead).length || 0;

  const activeLabel = menuGroups
    .flatMap(g => g.items)
    .find(item => item.path === location)?.label || "AgroGestão";

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleNavigate = (path: string) => {
    setLocation(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r" disableTransition={isResizing}>
          <SidebarHeader className="h-16 border-b">
            <div className="flex items-center gap-3 px-2 w-full">
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => setOpenMobile(false)}
                  className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {(!isCollapsed || isMobile) && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none">AgroGestão</p>
                    <p className="text-xs text-muted-foreground">CRM</p>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-4">
            {menuGroups.map(group => (
              <SidebarGroup key={group.label} className="py-3">
                {(!isCollapsed || isMobile) && (
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wide px-3 text-muted-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2 gap-1">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavigate(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-colors ${
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent w-full text-left min-h-[44px]">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  {(!isCollapsed || isMobile) && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{user?.name || "Admin"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                    </div>
                  )}
                  {(!isCollapsed || isMobile) && <ChevronUp className="h-3 w-3" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleNavigate("/preferencias")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Preferências</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isMobile && (
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 ${
              isCollapsed ? "hidden" : ""
            }`}
            onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset>
        <div className="flex border-b h-14 items-center justify-between bg-background px-4 sticky top-0 z-40 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm">{activeLabel}</span>
          </div>
          <button
            onClick={() => handleNavigate("/")}
            className="relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <main className="flex-1 p-4 md:p-6 bg-background/50">{children}</main>
      </SidebarInset>
    </>
  );
}
