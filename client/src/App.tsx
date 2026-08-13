import { useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";

// In dev, client (5173) and server (3001) run on different ports.
// In production the server serves the built client itself, so requests
// are same-origin and this should be left empty.
const TOKEN_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL ?? "http://localhost:3001";

function JoinForm({
  onJoin,
}: {
  onJoin: (room: string, name: string) => void;
}) {
  const [room, setRoom] = useState("debate-1");
  const [name, setName] = useState("");

  return (
    <form
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxWidth: "320px",
        margin: "4rem auto",
        fontFamily: "sans-serif",
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && room.trim()) onJoin(room.trim(), name.trim());
      }}
    >
      <h1 style={{ fontSize: "1.5rem" }}>Counsel Culture</h1>
      <label>
        Room name
        <input value={room} onChange={(e) => setRoom(e.target.value)} />
      </label>
      <label>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit">Join room</button>
    </form>
  );
}

export default function App() {
  const [details, setDetails] = useState<{
    token: string;
    url: string;
  } | null>(null);

  async function handleJoin(room: string, identity: string) {
    const res = await fetch(`${TOKEN_SERVER_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, identity }),
    });
    if (!res.ok) {
      alert("Failed to get a token from the server");
      return;
    }
    const data = await res.json();
    setDetails(data);
  }

  if (!details) {
    return <JoinForm onJoin={handleJoin} />;
  }

  return (
    <LiveKitRoom
      serverUrl={details.url}
      token={details.token}
      connect
      video
      audio
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onDisconnected={() => setDetails(null)}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
