import { RoomServiceClient } from "livekit-server-sdk";
import { DebateEngine } from "./debateEngine.js";

function toHttpUrl(wsUrl) {
  return wsUrl.replace(/^ws(s?):\/\//, "http$1://");
}

export function createDebateStore({ livekitUrl, apiKey, apiSecret }) {
  const roomService = new RoomServiceClient(toHttpUrl(livekitUrl), apiKey, apiSecret);
  const engines = new Map();

  return {
    get(debateRoomName) {
      let engine = engines.get(debateRoomName);
      if (!engine) {
        engine = new DebateEngine(debateRoomName, roomService);
        engines.set(debateRoomName, engine);
      }
      return engine;
    },
  };
}
