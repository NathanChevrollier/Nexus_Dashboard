"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateDashboardTheme(
  dashboardId: string,
  themeConfig: any
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que l'utilisateur possède ce dashboard
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId))
    .limit(1);

  if (!dashboard || dashboard.userId !== session.user.id) {
    throw new Error("Non autorisé");
  }

  await db
    .update(dashboards)
    .set({ themeConfig })
    .where(eq(dashboards.id, dashboardId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDashboardCustomCss(
  dashboardId: string,
  customCss: string
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que l'utilisateur est VIP ou ADMIN
  if (session.user.role === "USER") {
    throw new Error("Accès VIP requis");
  }

  // Vérifier que l'utilisateur possède ce dashboard
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId))
    .limit(1);

  if (!dashboard || dashboard.userId !== session.user.id) {
    throw new Error("Non autorisé");
  }

  // Scoper le CSS avec l'ID du dashboard
  const scopedCss = scopeCssForDashboard(dashboardId, customCss);

  await db
    .update(dashboards)
    .set({ customCss: scopedCss })
    .where(eq(dashboards.id, dashboardId));

  revalidatePath("/dashboard");
  return { success: true };
}

// Fonction pour scoper le CSS (sécurité)
function scopeCssForDashboard(dashboardId: string, css: string): string {
  // Filtrer les sélecteurs globaux dangereux
  const dangerousSelectors = ["html", "body", "*"];
  let scopedCss = css;

  // Préfixer chaque règle CSS avec l'ID du dashboard
  const dashboardSelector = `#dash-${dashboardId}`;
  
  // Simple scoping - dans un vrai projet, utiliser un parser CSS
  // Pour l'exemple, on ajoute simplement le préfixe
  scopedCss = scopedCss
    .split("}")
    .map((rule) => {
      if (rule.trim() === "") return "";
      
      const [selector, ...declarations] = rule.split("{");
      if (!selector || !declarations.length) return rule;

      // Vérifier les sélecteurs dangereux
      const trimmedSelector = selector.trim();
      if (dangerousSelectors.some((s) => trimmedSelector.includes(s))) {
        return ""; // Ignorer les règles dangereuses
      }

      return `${dashboardSelector} ${trimmedSelector} { ${declarations.join("{")}`;
    })
    .join("}\n");

  return scopedCss;
}

export async function updateGlobalCss(css: string) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que l'utilisateur est ADMIN
  if (session.user.role !== "ADMIN") {
    throw new Error("Accès administrateur requis");
  }

  // TODO: Stocker le CSS global dans une table de configuration
  // Pour l'instant, on simule
  
  revalidatePath("/");
  return { success: true };
}
