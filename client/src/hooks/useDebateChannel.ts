import { useCallback, useEffect, useState } from "react";
import { useDataChannel } from "@livekit/components-react";
import type { ReceivedDataMessage } from "@livekit/components-core";
import type { DebateState, TranscriptLine } from "../types";
import { fetchDebateState, fetchTranscript } from "../lib/api";

const emptyState: DebateState = {
  topic: null,
  phase: "waiting",
  queue: [],
  currentSpeaker: null,
  nextSpeaker: null,
  turnEndsAt: null,
  handoffEndsAt: null,
};

const decoder = new TextDecoder();

// Must be rendered under a <RoomContext.Provider> for the connected debate
// room - it hydrates from the REST API on mount (for late joiners) and then
// stays live via the room's data channel broadcasts.
export function useDebateChannel(debateRoom: string) {
  const [state, setState] = useState<DebateState>(emptyState);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchDebateState(debateRoom).then((s) => {
      if (!cancelled) setState(s);
    }).catch(() => {});
    fetchTranscript(debateRoom).then((t) => {
      if (!cancelled) setTranscript(t);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debateRoom]);

  const onStateMessage = useCallback((msg: ReceivedDataMessage<"debate-state">) => {
    try {
      const parsed = JSON.parse(decoder.decode(msg.payload));
      setState({
        topic: parsed.topic,
        phase: parsed.phase,
        queue: parsed.queue,
        currentSpeaker: parsed.currentSpeaker,
        nextSpeaker: parsed.nextSpeaker,
        turnEndsAt: parsed.turnEndsAt,
        handoffEndsAt: parsed.handoffEndsAt,
      });
    } catch {
      // ignore malformed payloads
    }
  }, []);

  const onTranscriptMessage = useCallback((msg: ReceivedDataMessage<"debate-transcript">) => {
    try {
      const parsed = JSON.parse(decoder.decode(msg.payload));
      if (parsed.type === "transcript-line") {
        setTranscript((prev) => [...prev, parsed.line]);
      } else if (parsed.type === "fact-check-result") {
        setTranscript((prev) =>
          prev.map((line) =>
            line.id === parsed.lineId ? { ...line, factCheck: parsed.result } : line,
          ),
        );
      }
    } catch {
      // ignore malformed payloads
    }
  }, []);

  useDataChannel("debate-state", onStateMessage);
  useDataChannel("debate-transcript", onTranscriptMessage);

  return { state, transcript };
}
