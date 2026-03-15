"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface PairStatusResponse {
  paired: boolean;
  pair?: {
    id: string;
    code: string;
    status: string;
    partner: { name: string | null; image: string | null } | null;
  };
}

export function usePairStatus() {
  const { data, error, isLoading, mutate } = useSWR<PairStatusResponse>(
    "/api/pair/status",
    fetcher,
    { revalidateOnFocus: true }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}
