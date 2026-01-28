import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Endpoint de maintenance pour nettoyer les anciens avatars
 * Supprime les fichiers d'avatar qui n'ont pas été accédés depuis 30 jours
 * Peut être appelé par un cron job externe ou manuellement
 */
export async function POST(request: NextRequest) {
  // Vérifier l'authentification simple (peut être amélioré avec une vraie clé API)
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.MAINTENANCE_TOKEN || "default-maintenance-token";

  if (!authHeader?.includes(expectedToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");

    // Vérifier que le dossier existe
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({
        ok: true,
        message: "Dossier avatars n'existe pas",
        cleaned: 0,
      });
    }

    const files = await readdir(uploadsDir);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const filePath = join(uploadsDir, file);
        const stats = await stat(filePath);
        const ageMs = now - stats.mtimeMs;

        // Supprimer les fichiers plus vieux que 30 jours
        if (ageMs > thirtyDaysMs) {
          await unlink(filePath);
          cleaned++;
        }
      } catch (error) {
        errors.push(`Erreur lors du traitement de ${file}: ${error}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Nettoyage complété. ${cleaned} fichier(s) supprimé(s).`,
      cleaned,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Erreur lors du nettoyage des avatars" },
      { status: 500 }
    );
  }
}

// Route GET pour vérifier l'état du nettoyage (sans supprimer)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.MAINTENANCE_TOKEN || "default-maintenance-token";

  if (!authHeader?.includes(expectedToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({
        ok: true,
        totalFiles: 0,
        oldFiles: 0,
      });
    }

    const files = await readdir(uploadsDir);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let oldCount = 0;
    const fileInfo: Array<{ name: string; age: number; size: number }> = [];

    for (const file of files) {
      const filePath = join(uploadsDir, file);
      const stats = await stat(filePath);
      const ageMs = now - stats.mtimeMs;
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

      fileInfo.push({
        name: file,
        age: ageDays,
        size: stats.size,
      });

      if (ageMs > thirtyDaysMs) {
        oldCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      totalFiles: files.length,
      oldFiles: oldCount,
      files: fileInfo.sort((a, b) => b.age - a.age),
    });
  } catch (error) {
    console.error("Check cleanup error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
