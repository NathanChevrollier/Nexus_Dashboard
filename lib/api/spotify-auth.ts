import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/**
 * Retrieves a valid Spotify access token for the given user.
 * Automatically refreshes the token if it's expired or about to expire.
 */
export async function getValidSpotifyToken(userId: string): Promise<string | null> {
  const [user] = await db
    .select({
      accessToken: users.spotifyAccessToken,
      refreshToken: users.spotifyRefreshToken,
      expiresAt: users.spotifyTokenExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.accessToken || !user.refreshToken) {
    return null;
  }

  // Check if token is expired (giving a 5 minute buffer)
  const isExpired = Date.now() > (Number(user.expiresAt) || 0) - 5 * 60 * 1000;

  if (!isExpired) {
    return user.accessToken;
  }

  console.log("Refreshing Spotify token for user", userId);

  // Token expired, refresh it
  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
      }),
    });

    if (!response.ok) {
        console.error("Failed to refresh Spotify token", await response.text());
        // Optionnel: On pourrait révoquer le token en base si le refresh échoue (révoc user)
        return null;
    }

    const data = await response.json();

    const newAccessToken = data.access_token;
    // expires_in is in seconds
    const newExpiresAt = Date.now() + data.expires_in * 1000;
    
    // Sometimes a new refresh token is returned, but usually it's the same unless rotated
    const newRefreshToken = data.refresh_token || user.refreshToken;

    await db
      .update(users)
      .set({
        spotifyAccessToken: newAccessToken,
        spotifyRefreshToken: newRefreshToken,
        spotifyTokenExpiresAt: newExpiresAt,
      })
      .where(eq(users.id, userId));

    return newAccessToken;
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
    return null;
  }
}
