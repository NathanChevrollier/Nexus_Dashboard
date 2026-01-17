import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateId } from "@/lib/utils";
import { z } from "zod";
import { createNotification } from '@/lib/notifications';

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validation
    const validatedData = registerSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validatedData.data;

    // Vérifier si l'email existe déjà
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé." },
        { status: 400 }
      );
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      name,
      email,
      password: hashedPassword,
      role: "USER",
      status: "PENDING", // Par défaut, le compte doit être validé par un admin
    });

    // Notifier les admins (persist + emit best-effort)
    (async () => {
      try {
        const admins = await db.select().from(users).where(eq(users.role, 'ADMIN'));
        for (const a of admins || []) {
          try {
            await createNotification({
              userId: a.id,
              type: 'user:pending',
              title: 'Nouvel utilisateur en attente',
              message: `Utilisateur ${name} (${email}) en attente de validation`,
              payload: { userId, name, email, timestamp: Date.now() },
            });
          } catch (e) {
            console.debug('notify admin failed for', a.id, e);
          }
        }
      } catch (e) {
        console.debug('notify admins failed', e);
      }
    })();

    return NextResponse.json(
      { message: "Inscription réussie. Votre compte est en attente de validation." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription." },
      { status: 500 }
    );
  }
}
