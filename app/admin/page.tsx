import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import AdminClientPage from "./admin-client-page";

export default async function AdminPage() {
  const session = await auth();

  // Redirect if not admin
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all users
  const allUsers = await db.select().from(users);

  return <AdminClientPage users={allUsers} />;
}

