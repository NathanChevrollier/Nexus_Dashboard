import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/actions/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur a la permission MANAGE_ANNOUNCEMENTS
    const {allowed, error: permError} = await requirePermission("MANAGE_ANNOUNCEMENTS");
    if (!allowed) {
      return NextResponse.json({ error: permError || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { announcement } = body;

    // Envoyer la notification socket à tous les utilisateurs connectés
    const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:4001';
    
    try {
      await fetch(`${socketUrl}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'announcement:new',
          data: {
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            createdAt: announcement.createdAt,
          }
        })
      });
    } catch (socketError) {
      console.error('Error sending socket broadcast:', socketError);
      // On ne fail pas si le socket ne répond pas
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in announcement broadcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
