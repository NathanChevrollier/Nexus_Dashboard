"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Plus, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Dashboard } from "@/lib/db/schema";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: "USER" | "VIP" | "ADMIN";
  };
  dashboards: Dashboard[];
  currentDashboardId: string;
}

export function Navbar({ user, dashboards, currentDashboardId }: NavbarProps) {
  return (
    <nav className="border-b bg-gradient-to-br from-card/50 via-background to-card/30 backdrop-blur-xl shadow-lg sticky top-0 z-50 relative overflow-hidden">
      {/* Effets de fond décoratifs */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative px-8 py-3.5 flex items-center justify-between">
        {/* Logo et dashboards */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-lg" />
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all border border-primary/20">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
              Nexus
            </span>
          </Link>
          
          <div className="h-8 w-px bg-border/50" />
          
          <div className="flex items-center gap-2">
            {dashboards.map((dash) => (
              <Link
                key={dash.id}
                href={`/dashboard/${dash.slug}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dash.id === currentDashboardId
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {dash.name}
              </Link>
            ))}
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-accent/50" asChild>
              <Link href="/dashboard/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* User info et actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-card/50 rounded-lg border border-border/50 backdrop-blur-sm">
            <span className="font-semibold text-sm text-foreground">Admin</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30">
              {user.role}
            </span>
          </div>
          
          <div className="h-8 w-px bg-border/50" />
          
          <Link href="/settings">
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-accent/50">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
