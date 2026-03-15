"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/Header";
import { PairCodeDisplay } from "@/components/pair/PairCodeDisplay";
import { PairCodeEntry } from "@/components/pair/PairCodeEntry";
import { PartnerStatus } from "@/components/pair/PartnerStatus";
import { usePairStatus } from "@/hooks/usePairStatus";

export default function PairPage() {
  const router = useRouter();
  const { data: pairData, isLoading, refresh } = usePairStatus();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // If already actively paired, redirect to dashboard
  if (pairData?.paired && pairData.pair?.status === "ACTIVE") {
    router.push("/dashboard");
    return null;
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/pair/create", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCreatedCode(data.code);
        refresh();
      } else {
        alert(data.error || "Failed to create pair");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (code: string) => {
    const res = await fetch("/api/pair/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to join");
    }
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-4 py-12">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </>
    );
  }

  // Show waiting state if pair is PENDING (user already created a code)
  const pendingCode = createdCode || (pairData?.paired && pairData.pair?.status === "PENDING" ? pairData.pair.code : null);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md space-y-6 px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pair with Your Partner</h2>
          <p className="mt-1 text-muted-foreground">
            Connect your calendars to coordinate kid duty.
          </p>
        </div>

        {pairData?.pair?.partner && (
          <PartnerStatus
            partner={pairData.pair.partner}
            status={pairData.pair.status}
          />
        )}

        {pendingCode ? (
          <PairCodeDisplay code={pendingCode} />
        ) : (
          <>
            <Button
              onClick={handleCreate}
              className="w-full"
              size="lg"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create a Pair Code"}
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <PairCodeEntry onJoin={handleJoin} />
          </>
        )}
      </main>
    </>
  );
}
