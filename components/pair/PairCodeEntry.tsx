"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PairCodeEntryProps {
  onJoin: (code: string) => Promise<void>;
}

export function PairCodeEntry({ onJoin }: PairCodeEntryProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;

    setLoading(true);
    setError(null);
    try {
      await onJoin(code.toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a Pair</CardTitle>
        <CardDescription>
          Enter the 6-character code from your partner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            className="font-mono text-center text-2xl tracking-[0.3em]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={code.length < 6 || loading}
          >
            {loading ? "Joining..." : "Join Pair"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
