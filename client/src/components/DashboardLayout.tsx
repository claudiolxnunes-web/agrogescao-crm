import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  BarChart3,
  Package,
  Target,
  ShoppingCart,
  Building2,
  Briefcase,
  Map,
  Settings,
} from "lucide-react";
import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Início", path: "/" },
  { icon: BarChart3, label: "Vendas", path: "/vendas" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Users, label: "Representantes", path: "/representantes" },
  { icon: Building2, label: "Clientes", path: "/clientes" },
  { icon: Briefcase, label: "Oportunidades", path: "/oportunidades" },
  { icon: Target, label: "Metas", path: "/metas" },
  { icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
  { icon: Package, label: "Importar", path: "/importacao" },
  { icon: Map, label: "Mapa", path: "/mapa" },
  { icon: Settings, label: "Preferências", path: "/preferencias" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <DashboardLayoutSkeleton />;

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar className="border-r-0">
        <SidebarHeader className="h-20 border-b flex items-center justify-between px-4">
          <button
            onClick={toggleSidebar}
            className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-lg transition-all"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/90 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-sm">Gestão Regional</span>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 py-6">
          <SidebarMenu className="gap-2 px-2">
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className={`
                      h-14 px-4 rounded-lg font-medium text-base transition-all
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-accent/80 text-foreground hover:shadow-sm"
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t p-4 gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent w-full transition-all">
                <Avatar className="h-10 w-10 border-2">
                  <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{user?.name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive h-10">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-base">Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}