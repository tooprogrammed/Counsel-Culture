export type DebatePhase = "waiting" | "speaking" | "handoff";

export interface DebateState {
  topic: string | null;
  phase: DebatePhase;
  queue: string[];
  currentSpeaker: string | null;
  nextSpeaker: string | null;
  turnEndsAt: number | null;
  handoffEndsAt: number | null;
}

export interface FactCheckResult {
  verdict: string;
  explanation: string;
  confidence: string;
  checkedAt: number;
}

export interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  ts: number;
  factCheck: FactCheckResult | null;
}

export type TokenRole = "chat" | "debate-participant" | "debate-observer";
