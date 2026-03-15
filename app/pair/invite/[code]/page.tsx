"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = params.code as string;

  useEffect(() => {
    // Auto-join if signed in
    if (status === "authenticated" && !joining && !error) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/pair/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Failed to join");
      }
    } catch {
      setError("Network error");
    } finally {
      setJoining(false);
    }
  };

  if (status === "loading" || joining) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          {joining ? "Joining pair..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Join KidShift</CardTitle>
            <CardDescription>
              Your partner invited you to coordinate calendars.
              <br />
              Code: <span className="font-mono font-bold">{code}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                signIn("google", {
                  callbackUrl: `/pair/invite/${code}`,
                })
              }
              className="w-full"
              size="lg"
            >
              Sign in with Google to Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Could Not Join</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleJoin} className="w-full">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/pair")}
              className="w-full"
            >
              Go to Pair Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
