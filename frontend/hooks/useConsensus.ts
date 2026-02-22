"use client";

import { useState, useCallback } from "react";
import { askStream } from "@/lib/api";
import type { ConsensusResponse } from "@/lib/types";

export function useConsensus() {
  const [response, setResponse] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState("");

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setStreamStatus("");
    setLoading(false);
  }, []);

  const ask = useCallback(
    async (
      question: string,
      mode: "consensus" | "fast" = "consensus",
    ): Promise<ConsensusResponse | null> => {
      if (!question.trim()) return null;

      setLoading(true);
      setResponse(null);
      setError(null);
      setStreamStatus("Initializing...");

      try {
        const reader = await askStream(question, mode as "consensus" | "fast");
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResponse: ConsensusResponse | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (
                data.status === "searching" ||
                data.status === "analyzing" ||
                data.status === "generating"
              ) {
                setStreamStatus(data.message);
              } else if (data.status === "complete") {
                finalResponse = data as ConsensusResponse;
                setResponse(finalResponse);
                setStreamStatus("");
                setLoading(false);
              } else if (data.status === "error") {
                throw new Error(data.message);
              }
            }
          }
        }

        return finalResponse;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error connecting to backend.";
        setError(message);
        setStreamStatus("");
        return null;
      } finally {
        setLoading(false);
        setStreamStatus("");
      }
    },
    [],
  );

  return { response, loading, error, streamStatus, ask, reset };
}
