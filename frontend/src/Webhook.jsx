
import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:8000";

export default function Webhook() {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const eventSourceRef = useRef(null);

  function startListening() {
    if (eventSourceRef.current) return;

    const source = new EventSource(`${API_URL}/events`);
    eventSourceRef.current = source;

    source.addEventListener("connected", () => {
      setListening(true);
    });

    source.onmessage = (item) => {
      const announcement = JSON.parse(item.data);
      console.log(announcement)
    };

    source.onerror = () => {
      // EventSource automatically retries most failed connections.
      setListening(false);
    };
  }

  function stopListening() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setListening(false);
  }

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Live Announcements</h1>

      <p>
        Status: {listening ? "Listening" : "Not listening"}
      </p>

      <button
        onClick={listening ? stopListening : startListening}
      >
        {listening ? "Stop listening" : "Listen for events"}
      </button>
    </main>
  );
}
