import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DebugPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Debug Session</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard">Retour au Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>État actuel de la session utilisateur</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Has Session</p>
                <p className="text-lg font-mono">{session ? "✅ Yes" : "❌ No"}</p>
              </div>
              
              {session?.user && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-lg font-mono">{session.user.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg font-mono">{session.user.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg font-mono">{session.user.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-lg font-mono font-bold">{session.user.role}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Is Admin?</p>
                    <p className="text-lg font-mono">
                      {session.user.role === "ADMIN" ? "✅ Yes" : "❌ No"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Admin Page Access</p>
                    <p className="text-lg">
                      {session.user.role === "ADMIN" ? (
                        <Button asChild>
                          <Link href="/admin">Accéder à l'Admin</Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Accès refusé (non admin)</span>
                      )}
                    </p>
                  </div>
                </>
              )}
              
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Raw Session Data</p>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
