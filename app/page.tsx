"use client";

import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/pair");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">KidShift</h1>
        <p className="text-lg text-muted-foreground">
          Two parents, no daycare, one question:{" "}
          <strong>&quot;Can I take this meeting?&quot;</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Combines both parents&apos; Google Calendar free/busy data into a
          single view. See who&apos;s on kid duty at any time.
        </p>
        <Button
          onClick={() => signInWithGoogle("/pair")}
          size="lg"
          className="w-full"
        >
          Get Started with Google
        </Button>
        <p className="text-xs text-muted-foreground">
          Privacy-first: only free/busy times are accessed. Never event titles,
          descriptions, or attendees.
        </p>
      </div>
    </div>
  );
}
