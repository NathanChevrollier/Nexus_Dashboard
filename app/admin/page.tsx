import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { UserManagement } from "@/components/admin/user-management";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export default async function AdminPage() {
  console.log('[AdminPage] Loading admin page...');
  
  const session = await auth();
  console.log('[AdminPage] Session:', {
    hasSession: !!session,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    isAdmin: session?.user?.role === "ADMIN"
  });
  
  if (!session || session.user.role !== "ADMIN") {
    console.log('[AdminPage] Access denied, redirecting to dashboard');
    redirect("/dashboard");
  }

  console.log('[AdminPage] Access granted, loading users...');
  const allUsers = await db.select().from(users);
  console.log('[AdminPage] Loaded', allUsers.length, 'users');

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar simple pour la page admin */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Nexus Admin</span>
            </Link>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour au Dashboard
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Administration</h1>
          <p className="text-muted-foreground">Gestion des utilisateurs et des permissions</p>
        </div>
        
        <UserManagement users={allUsers} />
      </div>
    </div>
  );
}
