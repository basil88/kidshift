"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "/pair";

    if (!code) {
      // No code — maybe hash-based flow. Let Supabase detect it.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.location.href = next;
        } else {
          window.location.href = "/auth/signin";
        }
      });
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session) {
        console.error("Auth callback error:", error);
        setStatus("Sign-in failed. Redirecting...");
        window.location.href = "/auth/error?error=AuthFailed";
        return;
      }

      const { provider_token, provider_refresh_token } = data.session;

      if (provider_token) {
        try {
          const res = await fetch("/api/auth/store-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider_token,
              provider_refresh_token: provider_refresh_token || null,
            }),
          });
          if (!res.ok) {
            console.error("Failed to store token:", await res.text());
          }
        } catch (e) {
          console.error("Token store error:", e);
        }
      } else {
        console.warn("No provider_token in session");
      }

      window.location.href = next;
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-muted-foreground">{status}</p>
    </div>
  );
}
