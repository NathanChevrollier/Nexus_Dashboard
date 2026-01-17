import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé - Admin uniquement" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventType = "share:created", payload = {} } = body;

    // Envoyer au serveur Socket.io
    // Use server-side ENV first (internal network), then fall back to public client URL as last resort.
    const socketEmitBase = (process.env.SOCKET_EMIT_URL || process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:4001").replace(/\/$/, '');

    const response = await fetch(`${socketEmitBase}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: eventType,
        targetUserId: session.user.id,
        payload: {
          ...payload,
          userId: session.user.id,
          timestamp: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Socket server responded with ${response.status}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Événement émis avec succès",
      event: eventType,
      targetUserId: session.user.id
    });
  } catch (error: any) {
    console.error("Erreur lors de l'émission de l'événement test:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'émission de l'événement", details: error.message },
      { status: 500 }
    );
  }
}
