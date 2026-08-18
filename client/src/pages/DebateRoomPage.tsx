import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomContext, VideoConference, useLiveKitRoom } from "@livekit/components-react";
import type { Room } from "livekit-client";
import "@livekit/components-styles";
import {
  fetchFactCheckStatus,
  fetchToken,
  joinDebateQueue,
  postTranscriptLine,
  requestFactCheck,
  setDebateTopic,
} from "../lib/api";
import { getIdentity } from "../lib/identity";
import { debateRoomName } from "../lib/roomNaming";
import { useDebateChannel } from "../hooks/useDebateChannel";
import { useSpeechToTranscript } from "../hooks/useSpeechToTranscript";
import { DebateStatusBar } from "../components/DebateStatusBar";
import { HandoffBanner } from "../components/HandoffBanner";

export function DebateRoomPage() {
  const { room: chatRoom = "" } = useParams();
  const navigate = useNavigate();
  const identity = getIdentity();
  const debateRoom = debateRoomName(chatRoom);
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    if (!identity) {
      navigate("/");
      return;
    }
    fetchToken(debateRoom, identity, "debate-participant").then(setConn);
  }, [debateRoom, identity, navigate]);

  const { room } = useLiveKitRoom({
    serverUrl: conn?.url,
    token: conn?.token,
    connect: Boolean(conn),
    video: true,
    audio: false,
    onDisconnected: () => navigate(`/room/${encodeURIComponent(chatRoom)}`),
  });

  if (!identity) return null;
  if (!room) return <p className="status-message">Connecting to debate room…</p>;

  return (
    <RoomContext.Provider value={room}>
      <DebateRoomInner chatRoom={chatRoom} debateRoom={debateRoom} identity={identity} room={room} />
    </RoomContext.Provider>
  );
}

interface InnerProps {
  chatRoom: string;
  debateRoom: string;
  identity: string;
  room: Room;
}

function DebateRoomInner({ chatRoom, debateRoom, identity, room }: InnerProps) {
  const navigate = useNavigate();
  const { state, transcript } = useDebateChannel(debateRoom);
  const [topicInput, setTopicInput] = useState("");
  const [factCheckEnabled, setFactCheckEnabled] = useState(false);

  useEffect(() => {
    fetchFactCheckStatus().then((s) => setFactCheckEnabled(s.enabled)).catch(() => {});
  }, []);

  const isMyTurn = state.currentSpeaker === identity && state.phase === "speaking";

  // Server is authoritative (it revokes/grants the microphone track source
  // via updateParticipant); this just keeps the local mic in sync with that.
  useEffect(() => {
    room.localParticipant.setMicrophoneEnabled(isMyTurn).catch(() => {});
  }, [isMyTurn, room]);

  const transcription = useSpeechToTranscript({
    active: isMyTurn,
    onResult: (text) => {
      postTranscriptLine(debateRoom, identity, text).catch(() => {});
    },
  });

  const inQueue = state.queue.includes(identity);

  return (
    <div className="debate-room-layout">
      <header className="room-topbar">
        <button type="button" onClick={() => navigate(`/room/${encodeURIComponent(chatRoom)}`)}>
          ← Back to chat
        </button>
        <span className="room-name">Debate: {chatRoom}</span>
      </header>

      <DebateStatusBar state={state} corner />
      <HandoffBanner state={state} />

      <div className="debate-main">
        <div className="debate-video-area">
          <VideoConference />
        </div>

        <aside className="debate-side-panel">
          {!state.topic && (
            <form
              className="topic-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (topicInput.trim()) setDebateTopic(debateRoom, topicInput.trim()).catch(() => {});
              }}
            >
              <input
                placeholder="Set the debate topic…"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
              />
              <button type="submit">Start debate</button>
            </form>
          )}

          {!inQueue && (
            <button
              type="button"
              className="raise-hand-button"
              onClick={() => joinDebateQueue(debateRoom, identity).catch(() => {})}
            >
              Raise hand to speak
            </button>
          )}

          <div className="queue-list">
            <h3>Speaker queue</h3>
            {state.queue.length === 0 && <p className="status-message">Nobody in line yet.</p>}
            <ol>
              {state.queue.map((id) => (
                <li key={id} className={id === state.currentSpeaker ? "active" : undefined}>
                  {id}
                </li>
              ))}
            </ol>
          </div>

          <div className="transcript-panel">
            <h3>Transcript &amp; fact-check</h3>
            {isMyTurn && (
              <p className={`transcription-status ${transcription.status}`}>
                {transcription.status === "listening" &&
                  `🎙️ Listening… ${transcription.interimText || "(pause to submit a line)"}`}
                {(transcription.status === "unsupported" || transcription.status === "error") &&
                  `⚠️ ${transcription.error}`}
              </p>
            )}
            {transcript.length === 0 && <p className="status-message">Nothing said yet.</p>}
            {transcript.map((line) => (
              <div key={line.id} className="transcript-line">
                <p>
                  <strong>{line.speaker}:</strong> {line.text}
                </p>
                {line.factCheck ? (
                  <p className="fact-check-result">
                    <strong>{line.factCheck.verdict}</strong> — {line.factCheck.explanation}{" "}
                    <em>({line.factCheck.confidence} confidence)</em>
                  </p>
                ) : factCheckEnabled ? (
                  <button
                    type="button"
                    onClick={() => requestFactCheck(debateRoom, line.id).catch(() => {})}
                  >
                    Fact-check this
                  </button>
                ) : (
                  <p className="status-message">Fact-checking not configured</p>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
