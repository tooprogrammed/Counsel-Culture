import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { AccessToken } from "livekit-server-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, PORT = 3001 } = process.env;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET in server/.env");
}

const app = express();
app.use(cors());
app.use(express.json());

// Issues a room-join token for a participant.
// This is the "verify before going live" gate: right now it just requires a
// name + room, but this is where stream-key / auth / room-membership checks
// will plug in later.
app.post("/token", async (req, res) => {
  const { room, identity } = req.body ?? {};

  if (!room || !identity) {
    return res.status(400).json({ error: "room and identity are required" });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: identity,
    ttl: "10m",
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  res.json({ token, url: LIVEKIT_URL });
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
