import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LibraryPage from "@/components/dashboard/library/page";

export default async function DashboardLibraryPage() {
  const session = await auth();
  if (!session) redirect('/auth/login');

  return <LibraryPage />;
}
