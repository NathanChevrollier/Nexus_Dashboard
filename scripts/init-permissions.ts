/**
 * Script de migration pour initialiser le système de permissions
 * À exécuter avec: npx tsx scripts/init-permissions.ts
 */

import { db } from "@/lib/db";
import { rolePermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants/permissions";

type Role = 'USER' | 'VIP' | 'ADMIN';

async function initializePermissions() {
  console.log("🔐 Initialisation du système de permissions...\n");

  const roles: Role[] = ['USER', 'VIP', 'ADMIN'];
  let inserted = 0;
  let skipped = 0;

  for (const role of roles) {
    console.log(`\n📋 Traitement du rôle: ${role}`);
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];
    
    for (const permKey of defaultPerms) {
      // Vérifier si la permission existe déjà
      const existing = await db.query.rolePermissions.findFirst({
        where: (rolePermissions, { and, eq }) =>
          and(
            eq(rolePermissions.role, role),
            eq(rolePermissions.permission, permKey)
          ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Créer la permission
      await db.insert(rolePermissions).values({
        id: nanoid(),
        role,
        permission: permKey,
        enabled: true,
        updatedAt: new Date(),
      });
      
      inserted++;
      console.log(`  ✅ ${permKey}`);
    }

    console.log(`  Total pour ${role}: ${defaultPerms.length} permissions`);
  }

  console.log("\n✨ Migration terminée !");
  console.log(`📊 Résumé:`);
  console.log(`   - ${inserted} permissions créées`);
  console.log(`   - ${skipped} permissions existantes (ignorées)`);
  console.log(`   - Total: ${inserted + skipped} permissions\n`);
}

// Exécution
initializePermissions()
  .then(() => {
    console.log("✅ Succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
