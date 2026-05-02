import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Scale, FileText, FileSearch, History, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ADMIN_EMAIL = "mianather783@gmail.com";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4 border-b border-border flex items-center flex-row">
            <Scale className="h-6 w-6 text-primary mr-2" />
            <span className="font-serif font-bold text-xl tracking-tight text-white">Clausly</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent className="pt-4">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/generate"}>
                      <Link href="/generate" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Generate Document</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/review"}>
                      <Link href="/review" className="flex items-center">
                        <FileSearch className="mr-2 h-4 w-4" />
                        <span>Review Contract</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <div className="px-4 py-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</h4>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/documents")}>
                      <Link href="/documents" className="flex items-center">
                        <History className="mr-2 h-4 w-4" />
                        <span>Documents</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/reviews")}>
                      <Link href="/reviews" className="flex items-center">
                        <History className="mr-2 h-4 w-4" />
                        <span>Reviews</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {isAdmin && (
              <SidebarGroup>
                <div className="px-4 py-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</h4>
                </div>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin"}>
                        <Link href="/admin" className="flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-8 w-8 rounded-full border border-border">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col max-w-[150px]">
                <span className="text-sm font-medium truncate">{user?.fullName || "User"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-white" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="md:hidden p-4 border-b border-border flex items-center bg-card">
            <SidebarTrigger />
            <div className="ml-4 font-serif font-bold text-lg text-white flex items-center">
               <Scale className="h-5 w-5 text-primary mr-2" />
               Clausly
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
