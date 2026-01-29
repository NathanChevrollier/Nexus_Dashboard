import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    // Si pas connecté, on redirige vers le login de l'app
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=spotify_denied", req.url));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/spotify/callback`;

  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
        console.error("Spotify Token Exchange Failed:", await response.text());
        return NextResponse.redirect(new URL("/settings?error=spotify_token_error", req.url));
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_in } = data;
    const expiresAt = Date.now() + expires_in * 1000;

    await db
      .update(users)
      .set({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: expiresAt,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.redirect(new URL("/settings?success=spotify_connected", req.url));

  } catch (err) {
    console.error("Spotify Callback Error:", err);
    return NextResponse.redirect(new URL("/settings?error=spotify_callback_failed", req.url));
  }
}
