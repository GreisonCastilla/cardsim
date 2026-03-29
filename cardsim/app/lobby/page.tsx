"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WS_URL } from "../../lib/api";

export default function LobbyPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("cardsim_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    socket.onopen = () => {
      setMessages((prev) => [...prev, "Connected to Server Lobby"]);
    };
    socket.onmessage = (event) => {
      setMessages((prev) => [...prev, `Received: ${event.data}`]);
    };
    socket.onclose = () => {
      setMessages((prev) => [...prev, "Disconnected"]);
    };

    setWs(socket);

    return () => socket.close();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-400">Match Lobby</h1>
        <button className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600" onClick={() => router.push("/")}>Back to Menu</button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Create or Join Match</h2>
          <div className="flex gap-4">
            <button className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded font-bold" onClick={() => ws?.send("CREATE_MATCH")}>
              Create Public Match
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold" onClick={() => ws?.send("JOIN_MATCH")}>
              Join Match
            </button>
          </div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-lg overflow-y-auto h-64 font-mono text-sm leading-relaxed text-green-400">
          <h2 className="text-xl font-bold mb-4 text-white">Server Logs</h2>
          {messages.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
