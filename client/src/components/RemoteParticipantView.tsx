import { useEffect, useRef } from "react";
import { useRemoteParticipants } from "@livekit/components-react";

// Renders one remote participant's video+audio by identity, found via the
// RoomContext in scope. Used both by the full debate room and by the
// chat-room observer panel to show whoever currently holds the floor.
export function RemoteParticipantView({ identity }: { identity: string | null }) {
  const participants = useRemoteParticipants();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const participant = identity ? participants.find((p) => p.identity === identity) : undefined;
  const videoTrack = participant ? [...participant.videoTrackPublications.values()][0]?.track : undefined;
  const audioTrack = participant ? [...participant.audioTrackPublications.values()][0]?.track : undefined;

  useEffect(() => {
    if (videoTrack && videoRef.current) videoTrack.attach(videoRef.current);
    if (audioTrack && audioRef.current) audioTrack.attach(audioRef.current);
    return () => {
      videoTrack?.detach();
      audioTrack?.detach();
    };
  }, [videoTrack, audioTrack]);

  if (!participant) {
    return <div className="speaker-video-placeholder">No active speaker</div>;
  }

  return (
    <div className="speaker-video">
      <video ref={videoRef} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      <span className="speaker-video-label">{identity}</span>
    </div>
  );
}
