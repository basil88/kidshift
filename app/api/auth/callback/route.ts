import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/pair";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?error=NoCode`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${origin}/auth/error?error=AuthFailed`);
  }

  // Store Google tokens for FreeBusy API access
  const { provider_token, provider_refresh_token } = data.session;

  if (provider_token) {
    await supabaseAdmin.from("google_tokens").upsert({
      user_id: data.session.user.id,
      access_token: provider_token,
      refresh_token: provider_refresh_token || null,
      expires_at: Math.floor(Date.now() / 1000 + 3600), // Google tokens last ~1h
      updated_at: new Date().toISOString(),
    });
  }

  return response;
}
