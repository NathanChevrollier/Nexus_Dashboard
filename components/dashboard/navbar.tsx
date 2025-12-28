"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Plus, LayoutDashboard, Menu, X } from "lucide-react";
import Link from "next/link";
import { Dashboard } from "@/lib/db/schema";
import { useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className="border-b bg-gradient-to-br from-card/50 via-background to-card/30 backdrop-blur-xl shadow-lg sticky top-0 z-50 relative overflow-hidden">
      {/* Effets de fond décoratifs */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-lg" />
            <div className="relative p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all border border-primary/20">
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
          <span className="hidden sm:block text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            Nexus
          </span>
        </Link>
        
        {/* Desktop dashboards list */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-1 ml-4 lg:ml-8">
          <div className="h-8 w-px bg-border/50" />
          
          <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto max-w-md lg:max-w-none">
            {dashboards.slice(0, 4).map((dash) => (
              <Link
                key={dash.id}
                href={`/dashboard/${dash.slug}`}
                className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                  dash.id === currentDashboardId
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {dash.name}
              </Link>
            ))}
            {dashboards.length > 4 && (
              <span className="text-xs text-muted-foreground px-2">+{dashboards.length - 4}</span>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-accent/50 ml-1" asChild>
              <Link href="/dashboard/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* User info et actions - Desktop */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-lg border border-border/50 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="font-semibold text-xs lg:text-sm text-foreground">{user.name || user.email || 'Utilisateur'}</span>
            </div>
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

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-8 w-8 p-0 hover:bg-accent/50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-3">
            {/* Dashboards list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Dashboards</p>
              <div className="space-y-1">
                {dashboards.map((dash) => (
                  <Link
                    key={dash.id}
                    href={`/dashboard/${dash.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      dash.id === currentDashboardId
                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {dash.name}
                  </Link>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dashboard/new">
                  <Plus className="h-4 w-4" />
                  Nouveau Dashboard
                </Link>
              </Button>
            </div>

            <div className="border-t border-border/50 pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Utilisateur</p>
              <div className="text-sm">
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">Rôle: {user.role}</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3 space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/auth/login" });
                }}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
