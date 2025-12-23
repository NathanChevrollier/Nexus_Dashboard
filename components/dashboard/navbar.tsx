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
    <nav className="border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nexus</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {dashboards.map((dash) => (
              <Link
                key={dash.id}
                href={`/dashboard/${dash.slug}`}
                style={
                  dash.id === currentDashboardId
                    ? {
                        backgroundColor: "hsl(var(--selected))",
                        color: "hsl(var(--selected-foreground))",
                      }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  dash.id === currentDashboardId
                    ? "shadow-sm ring-1 ring-primary"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {dash.name}
              </Link>
            ))}
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-2">
            <span className="font-medium">{user.name}</span>
            {user.role !== "USER" && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {user.role}
              </span>
            )}
          </div>
          
          <Link href="/settings">
            <Button size="sm" variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
