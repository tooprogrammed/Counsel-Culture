import { DataPacket_Kind, TrackSource } from "livekit-server-sdk";

const TURN_DURATION_MS = 90_000;
const HANDOFF_DISPLAY_MS = 5_000;
const TICK_MS = 1_000;

const encoder = new TextEncoder();

// Authoritative state machine for one debate room. One instance per debate
// room name, held in memory by debateStore for the life of the process.
export class DebateEngine {
  constructor(roomName, roomService) {
    this.roomName = roomName;
    this.roomService = roomService;
    this.topic = null;
    this.queue = []; // identities, in speaking order
    this.currentIndex = -1;
    this.phase = "waiting"; // "waiting" | "speaking" | "handoff"
    this.turnEndsAt = null;
    this.handoffEndsAt = null;
    this.transcript = [];
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  getState() {
    const current = this.currentIndex >= 0 ? this.queue[this.currentIndex] : null;
    let next = null;
    if (this.queue.length > 0) {
      const idx = this.currentIndex === -1 ? 0 : (this.currentIndex + 1) % this.queue.length;
      next = this.queue[idx];
    }
    return {
      topic: this.topic,
      phase: this.phase,
      queue: this.queue,
      currentSpeaker: current,
      nextSpeaker: next,
      turnEndsAt: this.turnEndsAt,
      handoffEndsAt: this.handoffEndsAt,
    };
  }

  broadcastState(type) {
    this.sendData({ type, ...this.getState() }, "debate-state");
  }

  sendData(payload, topic) {
    const data = encoder.encode(JSON.stringify(payload));
    this.roomService
      .sendData(this.roomName, data, DataPacket_Kind.RELIABLE, { topic })
      .catch((err) => console.error(`[debate:${this.roomName}] broadcast failed`, err.message));
  }

  async setTopic(topic) {
    this.topic = topic;
    if (this.phase === "waiting" && this.queue.length > 0 && this.currentIndex === -1) {
      await this.beginTurn(0);
    } else {
      this.broadcastState("topic-set");
    }
  }

  async joinQueue(identity) {
    if (!this.queue.includes(identity)) this.queue.push(identity);
    if (this.phase === "waiting" && this.currentIndex === -1 && this.topic) {
      await this.beginTurn(0);
    } else {
      this.broadcastState("queue-updated");
    }
  }

  async beginTurn(index) {
    this.currentIndex = index;
    this.phase = "speaking";
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;
    this.handoffEndsAt = null;
    await this.setMicPermission(this.queue[index], true);
    this.broadcastState("turn-started");
  }

  async setMicPermission(identity, canSpeak) {
    if (!identity) return;
    try {
      await this.roomService.updateParticipant(this.roomName, identity, {
        permission: {
          canSubscribe: true,
          canPublish: true,
          canPublishData: true,
          canPublishSources: canSpeak
            ? [TrackSource.CAMERA, TrackSource.MICROPHONE]
            : [TrackSource.CAMERA],
        },
      });
    } catch (err) {
      // Participant may not be connected yet (e.g. queued before joining) - not fatal.
      console.error(`[debate:${this.roomName}] setMicPermission(${identity}) failed`, err.message);
    }
  }

  async tick() {
    const now = Date.now();
    if (this.phase === "speaking" && this.turnEndsAt && now >= this.turnEndsAt) {
      await this.startHandoff();
    } else if (this.phase === "handoff" && this.handoffEndsAt && now >= this.handoffEndsAt) {
      await this.completeHandoff();
    }
  }

  async startHandoff() {
    const currentIdentity = this.queue[this.currentIndex];
    await this.setMicPermission(currentIdentity, false);
    this.phase = "handoff";
    this.handoffEndsAt = Date.now() + HANDOFF_DISPLAY_MS;
    this.broadcastState("handoff-started");
  }

  async completeHandoff() {
    const nextIndex = this.queue.length > 0 ? (this.currentIndex + 1) % this.queue.length : -1;
    if (nextIndex === -1) {
      this.phase = "waiting";
      this.currentIndex = -1;
      this.turnEndsAt = null;
      this.handoffEndsAt = null;
      this.broadcastState("debate-paused");
      return;
    }
    await this.beginTurn(nextIndex);
  }

  addTranscriptLine(speaker, text) {
    const line = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      speaker,
      text,
      ts: Date.now(),
      factCheck: null,
    };
    this.transcript.push(line);
    this.sendData({ type: "transcript-line", line }, "debate-transcript");
    return line;
  }

  setFactCheck(lineId, result) {
    const line = this.transcript.find((l) => l.id === lineId);
    if (!line) return null;
    line.factCheck = result;
    this.sendData({ type: "fact-check-result", lineId, result }, "debate-transcript");
    return line;
  }

  destroy() {
    clearInterval(this.timer);
  }
}
