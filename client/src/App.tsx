import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { JoinPage } from "./pages/JoinPage";
import { ChatRoomPage } from "./pages/ChatRoomPage";
import { DebateRoomPage } from "./pages/DebateRoomPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/room/:room" element={<ChatRoomPage />} />
        <Route path="/room/:room/debate" element={<DebateRoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
