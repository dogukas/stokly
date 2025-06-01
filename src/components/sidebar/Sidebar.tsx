"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  HomeIcon,
  Package,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  BarChart,
  LogOut,
  User
} from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success("Çıkış yapıldı")
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      toast.error("Çıkış yapılırken bir hata oluştu")
    }
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      href: "/dashboard",
      badge: "Yeni",
    },
    {
      title: "Stok Sorgula",
      icon: <Package size={20} />,
      href: "/stock",
      badge: "12",
    },
    {
      title: "Satış Analiz",
      icon: <TrendingUp size={20} />,
      href: "/sales",
      badge: "Beta",
    },
    {
      title: "Personel Analiz",
      icon: <Users size={20} />,
      href: "/personnel-analysis",
      badge: "Yeni",
    },
    {
      title: "Personel Ciro ve KPI",
      icon: <BarChart size={20} />,
      href: "/personnel-kpi",
      badge: "Yeni",
    }
  ]

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-background border-r border-border transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-72",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-secondary/10">
        <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
          <HomeIcon size={24} className="text-primary" />
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Flope
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hover:bg-secondary/80"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-secondary/80 group relative",
              isCollapsed && "justify-center px-2"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="text-primary/60 group-hover:text-primary transition-colors">
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-all",
                  isCollapsed && "hidden"
                )}
              >
                {item.title}
              </span>
            </div>
            {item.badge && !isCollapsed && (
              <Badge
                variant="secondary"
                className="ml-auto bg-primary/10 text-primary hover:bg-primary/20"
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>

      {/* User Account & Logout */}
      <div className="border-t p-2">
        <div className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground",
          isCollapsed && "justify-center px-2"
        )}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {userEmail ? userEmail[0].toUpperCase() : <User size={16} />}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userEmail || 'Kullanıcı'}</p>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-full mt-2 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={16} />
          </Button>
        )}
      </div>
    </div>
  )
} 