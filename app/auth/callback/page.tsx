"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/pair";
    }
    if (!loading && !user) {
      // Give Supabase a moment to process the code exchange
      const timeout = setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-muted-foreground">Signing you in...</p>
    </div>
  );
}
