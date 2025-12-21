import "dotenv/config";
import { db } from "./lib/db/index";
import { users } from "./lib/db/schema";
import bcrypt from "bcryptjs";
import { generateId } from "./lib/utils";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Créer un utilisateur admin par défaut
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await db.insert(users).values({
      id: generateId(),
      name: "Admin",
      email: "admin@nexus.local",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    });

    console.log("✅ Admin user created:");
    console.log("   Email: admin@nexus.local");
    console.log("   Password: admin123");
    console.log("   Please change this password after first login!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }

  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed();
