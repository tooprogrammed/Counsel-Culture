import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setIdentity } from "../lib/identity";

export function JoinPage() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("debate-1");
  const [name, setName] = useState("");

  return (
    <form
      className="join-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !room.trim()) return;
        setIdentity(name.trim());
        navigate(`/room/${encodeURIComponent(room.trim())}`);
      }}
    >
      <h1>Counsel Culture</h1>
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
