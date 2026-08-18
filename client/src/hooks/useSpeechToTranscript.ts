import { useEffect, useRef, useState } from "react";

export type TranscriptionStatus = "inactive" | "unsupported" | "listening" | "error";

interface Options {
  active: boolean;
  onResult: (text: string) => void;
}

interface Result {
  status: TranscriptionStatus;
  error: string | null;
  interimText: string;
}

// Runs the browser's built-in speech recognition (Chrome/Edge only) while
// `active` is true, forwarding each finalized utterance. This is the
// dev-scale stand-in for a real server-side STT pipeline (Whisper/Deepgram) -
// see PROJECT_REPORT.md for the upgrade path. Surfaces status/errors instead
// of failing silently, since "nothing happened" is otherwise indistinguishable
// from "browser doesn't support this" or "mic permission denied."
export function useSpeechToTranscript({ active, onResult }: Options): Result {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [status, setStatus] = useState<TranscriptionStatus>("inactive");
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");

  useEffect(() => {
    if (!active) {
      setStatus("inactive");
      setError(null);
      setInterimText("");
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      setError("Live transcription needs Chrome or Edge (or another browser with Web Speech API support).");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let stoppedIntentionally = false;

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onResultRef.current(text);
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return; // expected during silence, not a real failure
      setStatus("error");
      setError(`Transcription error: ${event.error}`);
    };

    recognition.onend = () => {
      setInterimText("");
      if (stoppedIntentionally) return;
      try {
        recognition.start();
      } catch {
        // already starting/stopping - ignore
      }
    };

    recognition.start();

    return () => {
      stoppedIntentionally = true;
      recognition.onend = null;
      recognition.stop();
    };
  }, [active]);

  return { status, error, interimText };
}
