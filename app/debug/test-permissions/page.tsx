import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, type Role, getActivePermissions } from "@/lib/actions/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default async function TestPermissionsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Tester toutes les permissions importantes
  const testPermissions = [
    "ACCESS_ADMIN",
    "MANAGE_USERS",
    "MANAGE_ANNOUNCEMENTS",
    "MANAGE_IFRAME_ALLOWLIST",
    "CREATE_WIDGETS",
    "USE_WEATHER_WIDGET",
    "USE_CALENDAR_WIDGET",
  ];

  const permissionResults: Record<string, boolean> = {};
  
  for (const perm of testPermissions) {
    permissionResults[perm] = await hasPermission(
      session.user.role as Role,
      perm,
      session.user.id
    );
  }

  const activePerms = await getActivePermissions(session.user.role as Role, session.user.id);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Test des Permissions</h1>
          <Button asChild variant="outline">
            <Link href="/debug">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations Utilisateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-mono">{session.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-mono">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rôle</p>
                <Badge>{session.user.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <Badge variant={session.user.isOwner ? "default" : "secondary"}>
                  {session.user.isOwner ? "OUI" : "NON"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test des Permissions Individuelles</CardTitle>
            <CardDescription>
              Résultat de hasPermission() pour chaque permission testée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testPermissions.map((perm) => {
                const result = permissionResults[perm];
                return (
                  <div
                    key={perm}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <code className="text-sm font-mono">{perm}</code>
                    <div className="flex items-center gap-2">
                      {result ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <Badge variant="default">ACCORDÉ</Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <Badge variant="destructive">REFUSÉ</Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toutes les Permissions Actives</CardTitle>
            <CardDescription>
              Résultat de getActivePermissions() - {activePerms.length} permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activePerms.map((perm) => (
                <Badge key={perm} variant="outline">
                  {perm}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-600">Important</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ Si vous êtes <strong>owner</strong>, toutes les permissions devraient être ACCORDÉES</li>
              <li>✅ Si vous n'êtes pas owner, seules les permissions activées en DB devraient être ACCORDÉES</li>
              <li>✅ ACCESS_ADMIN devrait être REFUSÉ si vous n'êtes pas owner, même si vous êtes ADMIN</li>
              <li>✅ Les permissions en DB peuvent être désactivées même pour un owner, mais hasPermission() retournera true</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
