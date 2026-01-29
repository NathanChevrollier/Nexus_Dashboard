import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ error: "Missing Spotify Client ID" }, { status: 500 });
  }

  const scope = "user-read-private user-read-email playlist-read-private playlist-read-collaborative user-follow-read user-library-read";
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/spotify/callback`;
  
  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
}
