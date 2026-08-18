import { useEffect, useState } from "react";
import { RoomContext, useLiveKitRoom } from "@livekit/components-react";
import { fetchToken } from "../lib/api";
import { useDebateChannel } from "../hooks/useDebateChannel";
import { RemoteParticipantView } from "./RemoteParticipantView";
import { HandoffBanner } from "./HandoffBanner";
import { DebateStatusBar } from "./DebateStatusBar";

interface Props {
  debateRoom: string;
  identity: string;
  onOpenDebate: () => void;
}

// The "side discussion room" every chat room carries: a always-connected,
// subscribe-only view into that room's debate room, so anyone in the chat
// can see/hear what's happening without leaving chat or joining the debate.
export function DebateObserverPanel({ debateRoom, identity, onOpenDebate }: Props) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchToken(debateRoom, identity, "debate-observer").then((c) => {
      if (!cancelled) setConn(c);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debateRoom, identity]);

  const { room } = useLiveKitRoom({
    serverUrl: conn?.url,
    token: conn?.token,
    connect: Boolean(conn),
    audio: false,
    video: false,
  });

  return (
    <aside className="debate-observer-panel">
      <div className="debate-observer-header">
        <span>Debate room</span>
        <button type="button" onClick={onOpenDebate}>
          Open
        </button>
      </div>
      {room ? (
        <RoomContext.Provider value={room}>
          <DebateObserverContent debateRoom={debateRoom} />
        </RoomContext.Provider>
      ) : (
        <p className="status-message">Connecting…</p>
      )}
    </aside>
  );
}

function DebateObserverContent({ debateRoom }: { debateRoom: string }) {
  const { state, transcript } = useDebateChannel(debateRoom);
  const recentLines = transcript.slice(-3);

  return (
    <>
      <DebateStatusBar state={state} />
      <HandoffBanner state={state} />
      <RemoteParticipantView identity={state.currentSpeaker} />
      <div className="transcript-preview">
        {recentLines.length === 0 && <p className="status-message">No transcript yet.</p>}
        {recentLines.map((line) => (
          <p key={line.id}>
            <strong>{line.speaker}:</strong> {line.text}
          </p>
        ))}
      </div>
    </>
  );
}
