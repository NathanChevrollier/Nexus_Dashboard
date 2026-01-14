import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId, generateSlug } from "@/lib/utils";
import { z } from "zod";

const createDashboardSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  isPublic: z.boolean().optional().default(false),
  format: z.enum(['desktop','mobile']).optional().default('desktop'),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createDashboardSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, isPublic, format } = validatedData.data;
    const slug = generateSlug(name);
    const id = generateId();

    // Enforce role-based dashboard limits and public dashboards
    const role = session.user.role as string;
    if (role === 'USER') {
      // Count existing dashboards for this user
      const existing = await db.select().from(dashboards).where(eq(dashboards.userId, session.user.id));
      if (existing.length >= 2) {
        return NextResponse.json({ error: 'Limite de dashboards atteinte pour votre plan' }, { status: 403 });
      }
      if (isPublic) {
        return NextResponse.json({ error: 'Les dashboards publics ne sont pas disponibles pour votre plan' }, { status: 403 });
      }
    }

    await db.insert(dashboards).values({
      id,
      userId: session.user.id,
      name,
      slug,
      isPublic,
      format,
      themeConfig: null,
      customCss: null,
    });

    return NextResponse.json({ success: true, id, slug }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du dashboard:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
