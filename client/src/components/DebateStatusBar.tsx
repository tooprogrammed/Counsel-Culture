import { useEffect, useRef, useState } from "react";
import type { DebateState } from "../types";

function formatRemaining(endsAt: number | null): string {
  if (!endsAt) return "--:--";
  const remainingMs = Math.max(0, endsAt - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// The objective/topic + timer + current speaker display. `corner` renders it
// as a draggable, collapsible overlay anchored top-right of a relatively-
// positioned parent (the full debate room), so it can be moved or hidden
// when it sits over other controls. Omit `corner` for the compact inline
// version used in the chat-room observer panel, which stays static.
export function DebateStatusBar({ state, corner = false }: { state: DebateState; corner?: boolean }) {
  const [, forceTick] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const { startX, startY, originX, originY } = dragOrigin.current;
      setPosition({ x: originX + (e.clientX - startX), y: originY + (e.clientY - startY) });
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  function startDrag(e: React.PointerEvent) {
    dragOrigin.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    setDragging(true);
  }

  if (!corner) {
    return (
      <div className="debate-status-bar">
        <div className="debate-topic">{state.topic ?? "No topic set yet"}</div>
        <div className="debate-speaker-row">
          <span className="debate-speaker-name">{state.currentSpeaker ?? "—"}</span>
          <span className="debate-timer">{formatRemaining(state.turnEndsAt)}</span>
        </div>
      </div>
    );
  }

  const style = { transform: `translate(${position.x}px, ${position.y}px)` };

  if (collapsed) {
    return (
      <button
        type="button"
        className="debate-status-pill"
        style={style}
        onPointerDown={startDrag}
        onClick={() => setCollapsed(false)}
        title="Show topic panel"
      >
        <span aria-hidden>⠿</span> {state.currentSpeaker ?? "Topic"} · {formatRemaining(state.turnEndsAt)}
      </button>
    );
  }

  return (
    <div className={dragging ? "debate-status-bar corner dragging" : "debate-status-bar corner"} style={style}>
      <div className="debate-status-bar-handle" onPointerDown={startDrag}>
        <span className="drag-grip" aria-hidden>
          ⠿
        </span>
        <button
          type="button"
          className="collapse-button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed(true)}
          aria-label="Hide topic panel"
          title="Hide"
        >
          ×
        </button>
      </div>
      <div className="debate-topic">{state.topic ?? "No topic set yet"}</div>
      <div className="debate-speaker-row">
        <span className="debate-speaker-name">{state.currentSpeaker ?? "—"}</span>
        <span className="debate-timer">{formatRemaining(state.turnEndsAt)}</span>
      </div>
    </div>
  );
}
