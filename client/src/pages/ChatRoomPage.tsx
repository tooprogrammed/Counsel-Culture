import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { fetchToken } from "../lib/api";
import { getIdentity } from "../lib/identity";
import { debateRoomName } from "../lib/roomNaming";
import { DebateObserverPanel } from "../components/DebateObserverPanel";

export function ChatRoomPage() {
  const { room = "" } = useParams();
  const navigate = useNavigate();
  const identity = getIdentity();
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    if (!identity) {
      navigate("/");
      return;
    }
    fetchToken(room, identity, "chat").then(setConn);
  }, [room, identity, navigate]);

  if (!identity) return null;
  if (!conn) return <p className="status-message">Connecting…</p>;

  return (
    <div className="room-layout">
      <header className="room-topbar">
        <span className="room-name">{room}</span>
        <button
          type="button"
          className="debate-button"
          onClick={() => navigate(`/room/${encodeURIComponent(room)}/debate`)}
        >
          Debate
        </button>
      </header>
      <div className="room-main">
        <LiveKitRoom
          serverUrl={conn.url}
          token={conn.token}
          connect
          video
          audio
          data-lk-theme="default"
          style={{ height: "100%", flex: 1 }}
          onDisconnected={() => navigate("/")}
        >
          <VideoConference />
        </LiveKitRoom>
        <DebateObserverPanel
          debateRoom={debateRoomName(room)}
          identity={identity}
          onOpenDebate={() => navigate(`/room/${encodeURIComponent(room)}/debate`)}
        />
      </div>
    </div>
  );
}
