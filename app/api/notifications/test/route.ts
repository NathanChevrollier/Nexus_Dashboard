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

    const { emitToUser } = await import('@/lib/socket');

    await emitToUser(session.user.id, eventType, { ...payload, userId: session.user.id, timestamp: Date.now() });

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
