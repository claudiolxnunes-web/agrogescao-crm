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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
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
  Zap,
  Smartphone,
  Filter,
  X,
  Shield,
  DollarSign,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuGroups = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Gestão Comercial",
    items: [
      { icon: Users, label: "Representantes", path: "/representantes" },
      { icon: Building2, label: "Clientes", path: "/clientes" },
      { icon: DollarSign, label: "Vendas", path: "/vendas" },
      { icon: Briefcase, label: "Oportunidades", path: "/oportunidades" },
      { icon: Target, label: "Metas", path: "/metas" },
      { icon: Activity, label: "Atividades", path: "/atividades" },
    ],
  },
  {
    label: "Análise & IA",
    items: [
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
      { icon: Bot, label: "IA Insights", path: "/ia-insights" },
      { icon: TrendingUp, label: "Analytics", path: "/analytics" },
      { icon: Map, label: "Mapa Geográfico", path: "/mapa" },
    ],
  },
  {
    label: "Operações",
    items: [
      { icon: ClipboardList, label: "App Representante", path: "/campo" },
      { icon: Smartphone, label: "Registro de Campo", path: "/registro-mobile" },
      { icon: Bell, label: "Alertas", path: "/alertas" },
      { icon: Settings, label: "Preferências", path: "/preferencias" },
      { icon: Download, label: "Importar Dados", path: "/importacao" },
      { icon: Zap, label: "Automações", path: "/automacoes" },
    ],
  },
];

const adminMenuGroup = {
  label: "Administração",
  items: [
    { icon: Shield, label: "Admin", path: "/admin" },
  ],
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth({ redirectOnUnauthenticated: true });

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

  const isSuperadmin = user?.role === "superadmin";
  const displayMenuGroups = isSuperadmin ? [...menuGroups, adminMenuGroup] : menuGroups;

  const activeLabel = displayMenuGroups
    .flatMap(g => g.items)
    .find(item => item.path === location)?.label || "Dashboard";

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

  // Close mobile menu on navigation
  const handleNavigate = (path: string) => {
    setLocation(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => setOpenMobile(false)}
                  className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4 text-sidebar-foreground/70" />
                </button>
              )}
              {(!isCollapsed || isMobile) && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">AgroGestão</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-0.5">CRM Regional</p>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-3 overflow-y-auto">
            {displayMenuGroups.map(group => (
              <SidebarGroup key={group.label} className="py-2 gap-3">
                {(!isCollapsed || isMobile) && (
                  <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider px-3 py-2 h-8 flex items-center">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2 gap-1 flex flex-col">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    const isNotif = item.path === "/notificacoes" && unreadCount > 0;
                    return (
                      <SidebarMenuItem key={item.path} className="h-12 flex items-center">
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavigate(item.path)}
                          tooltip={item.label}
                          className={`h-full w-full transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent ${isActive ? "bg-sidebar-primary/20 text-sidebar-primary font-medium" : ""}`}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                          <span className="truncate text-sm">{item.label}</span>
                          {isNotif && (
                            <Badge className="ml-auto h-4 min-w-4 px-1 text-xs bg-red-500 text-white border-0">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none min-h-[44px]">
                  <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {(!isCollapsed || isMobile) && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">
                        {user?.name || "Usuário"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        {user?.email || ""}
                      </p>
                    </div>
                  )}
                  {(!isCollapsed || isMobile) && <ChevronUp className="h-3 w-3 text-sidebar-foreground/40 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleNavigate("/preferencias")}
                  className="cursor-pointer min-h-[44px]"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Preferências</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive min-h-[44px]"
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
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset>
        {/* Mobile/Tablet top bar */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">{activeLabel}</span>
            </div>
          </div>
          <button
            onClick={() => handleNavigate("/alertas")}
            className="relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
