import { prisma } from "@/lib/prisma";

// Refresh Google OAuth token if expired. Returns current access_token.
export async function getValidAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    throw new Error("NO_GOOGLE_ACCOUNT");
  }

  if (!account.access_token) {
    throw new Error("NO_ACCESS_TOKEN");
  }

  // Token still valid (with 5-min buffer)
  if (account.expires_at && account.expires_at * 1000 > Date.now() + 5 * 60 * 1000) {
    return account.access_token;
  }

  // Need to refresh
  if (!account.refresh_token) {
    throw new Error("NO_REFRESH_TOKEN");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token refresh failed:", error);
    throw new Error("TOKEN_REFRESH_FAILED");
  }

  const tokens = await response.json();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    },
  });

  return tokens.access_token;
}
