import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hasPermission, type Role } from "@/lib/actions/permissions";
import AdminClientPage from "./admin-client-page";

export default async function AdminPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/dashboard");
  }

  // Check actual ACCESS_ADMIN permission from database
  const canAccess = await hasPermission(session.user.role as Role, "ACCESS_ADMIN", session.user.id);
  if (!canAccess) {
    redirect("/dashboard");
  }

  // Fetch all users
  const allUsers = await db.select().from(users);

  return <AdminClientPage users={allUsers} />;
}

