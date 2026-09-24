import { useEffect, useRef, useState } from "react";

function App() {
  const socketRef = useRef(null);

  const [socketStatus, setSocketStatus] = useState("Connecting...");
  const [running, setRunning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [totalPhases, setTotalPhases] = useState(0);
  const [turnEndsAt, setTurnEndsAt] = useState(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socketRef.current = socket;

    socket.onopen = () => {
      setSocketStatus("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "DEBATE_STATE") {
        setRunning(data.state.running);
        setParticipants(data.state.participants);
        setCurrentSpeaker(data.state.currentSpeaker);
        setCurrentPhase(data.state.currentPhase);
        setCurrentPhaseIndex(data.state.currentPhaseIndex);
        setTotalPhases(data.state.totalPhases);
        setTurnEndsAt(data.state.turnEndsAt);
      }
    };

    socket.onclose = () => {
      setSocketStatus("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!turnEndsAt) {
      setRemaining(0);
      return;
    }

    const updateTimer = () => {
      const seconds = Math.max(
        0,
        Math.ceil((turnEndsAt - Date.now()) / 1000)
      );

      setRemaining(seconds);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [turnEndsAt]);

  function sendMessage(type) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type
        })
      );
    }
  }

  return (
    <div>
      <h1>Counsel Culture Moderation</h1>

      <p>{socketStatus}</p>

      {running && currentPhase ? (
        <>
          <h2>{currentPhase.name}</h2>

          <p>
            Phase {currentPhaseIndex + 1} of {totalPhases}
          </p>

          <h1>{remaining}</h1>

          <h2>
            {currentSpeaker?.name}
          </h2>
        </>
      ) : (
        <h2>Debate not running</h2>
      )}

      <div>
        {participants.map((participant) => (
          <div key={participant.id}>
            <h3>{participant.name}</h3>

            <p>
              {running &&
              currentSpeaker?.id === participant.id
                ? "SPOTLIGHT"
                : "Waiting"}
            </p>
          </div>
        ))}
      </div>

      <button onClick={() => sendMessage("START_DEBATE")}>
        Start Debate
      </button>

      <button onClick={() => sendMessage("NEXT_PHASE")}>
        Next Phase
      </button>

      <button onClick={() => sendMessage("STOP_DEBATE")}>
        Stop Debate
      </button>
    </div>
  );
}

export default App;