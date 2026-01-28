import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, unlink, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Magic bytes pour valider les vrais fichiers image
const MAGIC_BYTES: Record<string, Buffer> = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  gif: Buffer.from([0x47, 0x49, 0x46]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF header
};

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  // Déterminer le type basé sur MIME type
  let expectedBytes: Buffer | null = null;

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    expectedBytes = MAGIC_BYTES.jpeg;
  } else if (mimeType.includes("png")) {
    expectedBytes = MAGIC_BYTES.png;
  } else if (mimeType.includes("gif")) {
    expectedBytes = MAGIC_BYTES.gif;
  } else if (mimeType.includes("webp")) {
    expectedBytes = MAGIC_BYTES.webp;
  }

  if (!expectedBytes) return false;

  // Vérifier si le début du buffer correspond aux magic bytes
  return buffer.subarray(0, expectedBytes.length).equals(expectedBytes);
}

async function deleteOldAvatars(userId: string, uploadsDir: string): Promise<void> {
  try {
    const files = await readdir(uploadsDir);
    const userAvatarPattern = `avatar-${userId}-`;

    for (const file of files) {
      if (file.startsWith(userAvatarPattern)) {
        const filePath = join(uploadsDir, file);
        await unlink(filePath).catch(() => {
          // Ignorer les erreurs de suppression (fichier déjà supprimé, permissions, etc.)
        });
      }
    }
  } catch (error) {
    console.warn("Failed to delete old avatars:", error);
    // Ne pas échouer l'upload si la suppression des anciens fichiers échoue
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Vérifier le type de fichier déclaré
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP." },
        { status: 400 }
      );
    }

    // Vérifier la taille (max 5MB pour avatar)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux. Taille maximale : 5MB" },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Valider les magic bytes (vraie validation du fichier)
    if (!validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "Fichier invalide. Assurez-vous qu'il s'agit d'une vrai image." },
        { status: 400 }
      );
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Supprimer les anciens avatars de l'utilisateur (AVANT d'en uploader un nouveau)
    await deleteOldAvatars(session.user.id, uploadsDir);

    // Générer un nom de fichier unique avec timestamp
    const timestamp = Date.now();
    const fileExtension = file.type.includes("webp") 
      ? "webp" 
      : file.type.includes("png") 
        ? "png" 
        : file.type.includes("gif")
          ? "gif"
          : "jpg"; // Défaut JPEG

    const fileName = `avatar-${session.user.id}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Écrire le fichier
    await writeFile(filePath, buffer);

    // Retourner l'URL du fichier avec cache-busting
    const fileUrl = `/uploads/avatars/${fileName}?v=${timestamp}`;

    return NextResponse.json({
      ok: true,
      url: fileUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload de l'avatar" },
      { status: 500 }
    );
  }
}
