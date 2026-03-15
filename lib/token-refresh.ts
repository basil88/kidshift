import { supabaseAdmin } from "@/lib/supabase";

// Get a valid Google access token for a user, refreshing if needed
export async function getValidAccessToken(userId: string): Promise<string> {
  const { data: tokens, error } = await supabaseAdmin
    .from("google_tokens")
    .select()
    .eq("user_id", userId)
    .single();

  if (error || !tokens) {
    throw new Error("NO_GOOGLE_TOKENS");
  }

  if (!tokens.access_token) {
    throw new Error("NO_ACCESS_TOKEN");
  }

  // Token still valid (with 5-min buffer)
  if (tokens.expires_at && tokens.expires_at * 1000 > Date.now() + 5 * 60 * 1000) {
    return tokens.access_token;
  }

  // Need to refresh
  if (!tokens.refresh_token) {
    throw new Error("NO_REFRESH_TOKEN");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    console.error("Token refresh failed:", await response.text());
    throw new Error("TOKEN_REFRESH_FAILED");
  }

  const refreshed = await response.json();

  await supabaseAdmin.from("google_tokens").update({
    access_token: refreshed.access_token,
    expires_at: Math.floor(Date.now() / 1000 + refreshed.expires_in),
    ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}
