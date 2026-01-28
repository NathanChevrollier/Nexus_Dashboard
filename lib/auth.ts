import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "VIP" | "ADMIN";
      status: "PENDING" | "ACTIVE" | "BANNED";
      isOwner: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "VIP" | "ADMIN";
    status: "PENDING" | "ACTIVE" | "BANNED";
    isOwner: boolean;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // @ts-ignore - NextAuth adapter type mismatch between dependency versions
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const validatedData = loginSchema.safeParse(credentials);
        
        if (!validatedData.success) {
          return null;
        }

        const { email, password } = validatedData.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        // Vérifier le statut du compte
        if (user.status === "BANNED") {
          throw new Error("Account banned");
        }

        if (user.status === "PENDING") {
          throw new Error("Account pending approval");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isOwner: user.isOwner,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.isOwner = user.isOwner;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "VIP" | "ADMIN";
        session.user.status = token.status as "PENDING" | "ACTIVE" | "BANNED";
        session.user.isOwner = token.isOwner as boolean;
      }
      return session;
    },
  },
});
