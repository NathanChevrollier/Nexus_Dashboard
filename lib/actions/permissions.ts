"use server";

import { db } from "@/lib/db";
import { rolePermissions, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { AVAILABLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Type pour les rôles
 */
export type Role = 'USER' | 'VIP' | 'ADMIN';

/**
 * Interface pour une permission de rôle
 */
export interface RolePermission {
  id: string;
  role: Role;
  permission: string;
  enabled: boolean;
  updatedAt: Date;
}

/**
 * Récupère toutes les permissions groupées par rôle
 * @returns Object avec les permissions par rôle
 */
export async function getRolePermissions() {
  try {
    const session = await auth();
    
    // Seuls les admins peuvent voir toutes les permissions
    if (session?.user?.role !== 'ADMIN') {
      return { error: "Accès non autorisé" };
    }

    const permissions = await db.query.rolePermissions.findMany({
      orderBy: (rolePermissions, { asc }) => [
        asc(rolePermissions.role),
        asc(rolePermissions.permission)
      ],
    });

    // Grouper les permissions par rôle
    const permissionsByRole: Record<Role, RolePermission[]> = {
      USER: [],
      VIP: [],
      ADMIN: [],
    };

    permissions.forEach((perm) => {
      permissionsByRole[perm.role as Role].push(perm as RolePermission);
    });

    return { 
      success: true, 
      permissions: permissionsByRole,
      availablePermissions: AVAILABLE_PERMISSIONS,
    };
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return { error: "Erreur lors de la récupération des permissions" };
  }
}

/**
 * Active ou désactive une permission pour un rôle
 * @param role Le rôle concerné
 * @param permission La clé de la permission
 * @param enabled true pour activer, false pour désactiver
 */
export async function toggleRolePermission(
  role: Role,
  permission: string,
  enabled: boolean
) {
  try {
    const session = await auth();
    
    // Seuls les admins peuvent modifier les permissions
    if (session?.user?.role !== 'ADMIN') {
      return { error: "Accès non autorisé" };
    }

    // Vérifier que la permission existe dans la liste disponible
    const permissionExists = AVAILABLE_PERMISSIONS.some(p => p.key === permission);
    if (!permissionExists) {
      return { error: "Permission invalide" };
    }

    // Chercher si la permission existe déjà en DB
    const existing = await db.query.rolePermissions.findFirst({
      where: (rolePermissions, { and, eq }) =>
        and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.permission, permission)
        ),
    });

    if (existing) {
      // Mettre à jour la permission existante
      await db
        .update(rolePermissions)
        .set({ 
          enabled,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rolePermissions.role, role),
            eq(rolePermissions.permission, permission)
          )
        );
    } else {
      // Créer une nouvelle entrée
      await db.insert(rolePermissions).values({
        id: nanoid(),
        role,
        permission,
        enabled,
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error toggling role permission:", error);
    return { error: "Erreur lors de la modification de la permission" };
  }
}

/**
 * Vérifie si un rôle possède une permission spécifique
 * Cette fonction est utilisée côté serveur pour vérifier les droits
 * @param role Le rôle à vérifier
 * @param permissionKey La clé de la permission à vérifier
 * @returns true si le rôle a la permission, false sinon
 */
export async function hasPermission(
  role: Role,
  permissionKey: string
): Promise<boolean> {
  try {
    // Les admins ont toutes les permissions par défaut
    if (role === 'ADMIN') {
      return true;
    }

    // Chercher la permission en DB
    const permission = await db.query.rolePermissions.findFirst({
      where: (rolePermissions, { and, eq }) =>
        and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.permission, permissionKey)
        ),
    });

    // Si la permission existe en DB, retourner son état
    if (permission) {
      return permission.enabled;
    }

    // Sinon, utiliser les valeurs par défaut
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    return defaultPermissions.includes(permissionKey);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur connecté a une permission
 * Raccourci pratique qui récupère le rôle depuis la session
 * @param permissionKey La clé de la permission à vérifier
 * @returns true si l'utilisateur a la permission, false sinon
 */
export async function currentUserHasPermission(
  permissionKey: string
): Promise<boolean> {
  try {
    const session = await auth();
    
    if (!session?.user?.role) {
      return false;
    }

    return await hasPermission(session.user.role as Role, permissionKey);
  } catch (error) {
    console.error("Error checking current user permission:", error);
    return false;
  }
}

/**
 * Récupère toutes les permissions actives d'un rôle
 * @param role Le rôle concerné
 * @returns Liste des clés de permissions actives
 */
export async function getActivePermissions(role: Role): Promise<string[]> {
  try {
    // Les admins ont toutes les permissions
    if (role === 'ADMIN') {
      return AVAILABLE_PERMISSIONS.map(p => p.key);
    }

    // Récupérer les permissions depuis la DB
    const dbPermissions = await db.query.rolePermissions.findMany({
      where: (rolePermissions, { eq }) => eq(rolePermissions.role, role),
    });

    const activePermissions: string[] = [];
    const dbPermissionMap = new Map(
      dbPermissions.map(p => [p.permission, p.enabled])
    );

    // Pour chaque permission disponible, vérifier si elle est active
    AVAILABLE_PERMISSIONS.forEach((perm) => {
      // Si elle existe en DB, utiliser sa valeur
      if (dbPermissionMap.has(perm.key)) {
        if (dbPermissionMap.get(perm.key)) {
          activePermissions.push(perm.key);
        }
      } 
      // Sinon, utiliser les valeurs par défaut
      else if (DEFAULT_ROLE_PERMISSIONS[role]?.includes(perm.key)) {
        activePermissions.push(perm.key);
      }
    });

    return activePermissions;
  } catch (error) {
    console.error("Error getting active permissions:", error);
    return [];
  }
}

/**
 * Initialise les permissions par défaut pour tous les rôles
 * À appeler lors du premier déploiement ou d'une migration
 */
export async function initializeDefaultPermissions() {
  try {
    const session = await auth();
    
    // Seuls les admins peuvent initialiser les permissions
    if (session?.user?.role !== 'ADMIN') {
      return { error: "Accès non autorisé" };
    }

    const roles: Role[] = ['USER', 'VIP', 'ADMIN'];
    let inserted = 0;

    for (const role of roles) {
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

        // Créer seulement si elle n'existe pas
        if (!existing) {
          await db.insert(rolePermissions).values({
            id: nanoid(),
            role,
            permission: permKey,
            enabled: true,
            updatedAt: new Date(),
          });
          inserted++;
        }
      }
    }

    return { 
      success: true, 
      message: `${inserted} permissions initialisées`,
      inserted,
    };
  } catch (error) {
    console.error("Error initializing default permissions:", error);
    return { error: "Erreur lors de l'initialisation des permissions" };
  }
}

/**
 * Réinitialise toutes les permissions d'un rôle à leurs valeurs par défaut
 * @param role Le rôle à réinitialiser
 */
export async function resetRolePermissions(role: Role) {
  try {
    const session = await auth();
    
    // Seuls les admins peuvent réinitialiser les permissions
    if (session?.user?.role !== 'ADMIN') {
      return { error: "Accès non autorisé" };
    }

    // Supprimer toutes les permissions existantes pour ce rôle
    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.role, role));

    // Réinsérer les permissions par défaut
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];
    const values = defaultPerms.map(permKey => ({
      id: nanoid(),
      role,
      permission: permKey,
      enabled: true,
      updatedAt: new Date(),
    }));

    if (values.length > 0) {
      await db.insert(rolePermissions).values(values);
    }

    return { 
      success: true, 
      message: `Permissions du rôle ${role} réinitialisées`,
    };
  } catch (error) {
    console.error("Error resetting role permissions:", error);
    return { error: "Erreur lors de la réinitialisation des permissions" };
  }
}
