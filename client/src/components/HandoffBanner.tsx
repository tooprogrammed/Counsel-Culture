import type { DebateState } from "../types";

export function HandoffBanner({ state }: { state: DebateState }) {
  if (state.phase !== "handoff") return null;
  return (
    <div className="handoff-banner">
      microphone handoff : {state.currentSpeaker} --&gt; {state.nextSpeaker}
    </div>
  );
}
