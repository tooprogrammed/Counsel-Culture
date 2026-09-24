const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const debate = {
  running: false,

  participants: [
    {
      id: "speaker-a",
      name: "Speaker A",
      role: "debater"
    },
    {
      id: "speaker-b",
      name: "Speaker B",
      role: "debater"
    }
  ],

  phases: [
    {
      name: "Opening A",
      speakerId: "speaker-a",
      duration: 30
    },
    {
      name: "Opening B",
      speakerId: "speaker-b",
      duration: 30
    },
    {
      name: "Rebuttal A",
      speakerId: "speaker-a",
      duration: 30
    },
    {
      name: "Rebuttal B",
      speakerId: "speaker-b",
      duration: 30
    },
    {
      name: "Closing A",
      speakerId: "speaker-a",
      duration: 30
    },
    {
      name: "Closing B",
      speakerId: "speaker-b",
      duration: 30
    }
  ],

  currentPhaseIndex: 0,
  turnEndsAt: null
};

let turnTimer = null;

app.get("/", (req, res) => {
  res.json({
    message: "Counsel Culture Moderation server is running"
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

function getCurrentPhase() {
  return debate.phases[debate.currentPhaseIndex] || null;
}

function getCurrentSpeaker() {
  const phase = getCurrentPhase();

  if (!phase) {
    return null;
  }

  return debate.participants.find(
    (participant) => participant.id === phase.speakerId
  );
}

function getState() {
  return {
    running: debate.running,
    participants: debate.participants,
    currentPhase: getCurrentPhase(),
    currentPhaseIndex: debate.currentPhaseIndex,
    totalPhases: debate.phases.length,
    currentSpeaker: getCurrentSpeaker(),
    turnEndsAt: debate.turnEndsAt
  };
}

function broadcastState() {
  const message = JSON.stringify({
    type: "DEBATE_STATE",
    state: getState()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function startCurrentPhase() {
  const phase = getCurrentPhase();

  if (!phase) {
    finishDebate();
    return;
  }

  debate.turnEndsAt =
    Date.now() + phase.duration * 1000;

  console.log(
    `Phase: ${phase.name} | Speaker: ${getCurrentSpeaker().name}`
  );

  broadcastState();

  turnTimer = setTimeout(() => {
    nextPhase();
  }, phase.duration * 1000);
}

function nextPhase() {
  if (turnTimer) {
    clearTimeout(turnTimer);
    turnTimer = null;
  }

  debate.currentPhaseIndex++;

  if (debate.currentPhaseIndex >= debate.phases.length) {
    finishDebate();
    return;
  }

  startCurrentPhase();
}

function startDebate() {
  if (debate.running) {
    return;
  }

  debate.running = true;
  debate.currentPhaseIndex = 0;

  startCurrentPhase();
}

function stopDebate() {
  if (turnTimer) {
    clearTimeout(turnTimer);
    turnTimer = null;
  }

  debate.running = false;
  debate.turnEndsAt = null;

  broadcastState();
}

function finishDebate() {
  if (turnTimer) {
    clearTimeout(turnTimer);
    turnTimer = null;
  }

  debate.running = false;
  debate.turnEndsAt = null;

  console.log("Debate finished");

  broadcastState();
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(
    JSON.stringify({
      type: "DEBATE_STATE",
      state: getState()
    })
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "START_DEBATE") {
      startDebate();
    }

    if (data.type === "NEXT_PHASE" && debate.running) {
      nextPhase();
    }

    if (data.type === "STOP_DEBATE") {
      stopDebate();
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});