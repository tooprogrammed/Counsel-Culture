import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { createDebateStore } from "./debateStore.js";
import { checkClaim, factCheckingEnabled } from "./factCheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, PORT = 3001 } = process.env;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET in server/.env");
}

const debateStore = createDebateStore({
  livekitUrl: LIVEKIT_URL,
  apiKey: LIVEKIT_API_KEY,
  apiSecret: LIVEKIT_API_SECRET,
});

const app = express();
app.use(cors());
app.use(express.json());

// Issues a room-join token for a participant.
// `role` shapes what a participant is allowed to publish:
//  - "chat"              full audio+video, for the main chat room
//  - "debate-participant" video allowed immediately; microphone is granted
//                         dynamically by the debate engine when it's their turn
//  - "debate-observer"    subscribe-only, for chat-room users watching the
//                         debate without joining it (no publish at all)
// This is also the "verify before going live" gate: right now it just
// requires a name + room, but this is where stream-key / auth / room-
// membership checks will plug in later.
app.post("/token", async (req, res) => {
  const { room, identity, role = "chat" } = req.body ?? {};

  if (!room || !identity) {
    return res.status(400).json({ error: "room and identity are required" });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: identity,
    ttl: "4h",
  });

  const grant = { room, roomJoin: true, canSubscribe: true };
  if (role === "debate-observer") {
    grant.canPublish = false;
  } else if (role === "debate-participant") {
    grant.canPublish = true;
    grant.canPublishSources = [TrackSource.CAMERA];
  } else {
    grant.canPublish = true;
  }
  at.addGrant(grant);

  const token = await at.toJwt();
  res.json({ token, url: LIVEKIT_URL });
});

// --- Debate room state, transcript, and fact-checking ---
// `:room` is always the literal LiveKit debate room name (already suffixed
// by the client's naming convention) - this layer has no opinion on naming.

app.get("/debate/:room/state", (req, res) => {
  res.json(debateStore.get(req.params.room).getState());
});

app.post("/debate/:room/topic", async (req, res) => {
  const { topic } = req.body ?? {};
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "topic is required" });
  }
  const engine = debateStore.get(req.params.room);
  await engine.setTopic(topic.trim());
  res.json(engine.getState());
});

app.post("/debate/:room/queue", async (req, res) => {
  const { identity } = req.body ?? {};
  if (!identity) {
    return res.status(400).json({ error: "identity is required" });
  }
  const engine = debateStore.get(req.params.room);
  await engine.joinQueue(identity);
  res.json(engine.getState());
});

app.get("/debate/:room/transcript", (req, res) => {
  res.json(debateStore.get(req.params.room).transcript);
});

app.post("/debate/:room/transcript", (req, res) => {
  const { identity, text } = req.body ?? {};
  if (!identity || !text || !text.trim()) {
    return res.status(400).json({ error: "identity and text are required" });
  }
  const line = debateStore.get(req.params.room).addTranscriptLine(identity, text.trim());
  res.json(line);
});

app.get("/fact-check/status", (_req, res) => {
  res.json({ enabled: factCheckingEnabled() });
});

app.post("/debate/:room/fact-check/:lineId", async (req, res) => {
  const engine = debateStore.get(req.params.room);
  const line = engine.transcript.find((l) => l.id === req.params.lineId);
  if (!line) {
    return res.status(404).json({ error: "transcript line not found" });
  }
  try {
    const result = await checkClaim(line.text);
    engine.setFactCheck(line.id, result);
    res.json(result);
  } catch (err) {
    res.status(501).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// If a built client exists (client/dist, produced by `npm run build`),
// serve it from this same origin so the deployed VM only needs one port.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Token server listening on http://localhost:${PORT}`);
});
