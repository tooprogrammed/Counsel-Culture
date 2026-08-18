import type { DebateState, TokenRole, TranscriptLine } from "../types";

// In dev, client (5173) and server (3001) run on different ports.
// In production the server serves the built client itself, so requests
// are same-origin and this should be left empty.
const BASE = import.meta.env.VITE_TOKEN_SERVER_URL ?? "http://localhost:3001";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

export function fetchToken(room: string, identity: string, role: TokenRole) {
  return api<{ token: string; url: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ room, identity, role }),
  });
}

export function fetchDebateState(debateRoom: string) {
  return api<DebateState>(`/debate/${encodeURIComponent(debateRoom)}/state`);
}

export function fetchTranscript(debateRoom: string) {
  return api<TranscriptLine[]>(`/debate/${encodeURIComponent(debateRoom)}/transcript`);
}

export function setDebateTopic(debateRoom: string, topic: string) {
  return api<DebateState>(`/debate/${encodeURIComponent(debateRoom)}/topic`, {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export function joinDebateQueue(debateRoom: string, identity: string) {
  return api<DebateState>(`/debate/${encodeURIComponent(debateRoom)}/queue`, {
    method: "POST",
    body: JSON.stringify({ identity }),
  });
}

export function postTranscriptLine(debateRoom: string, identity: string, text: string) {
  return api<TranscriptLine>(`/debate/${encodeURIComponent(debateRoom)}/transcript`, {
    method: "POST",
    body: JSON.stringify({ identity, text }),
  });
}

export function fetchFactCheckStatus() {
  return api<{ enabled: boolean }>("/fact-check/status");
}

export function requestFactCheck(debateRoom: string, lineId: string) {
  return api<{ verdict: string; explanation: string; confidence: string; checkedAt: number }>(
    `/debate/${encodeURIComponent(debateRoom)}/fact-check/${encodeURIComponent(lineId)}`,
    { method: "POST" },
  );
}
