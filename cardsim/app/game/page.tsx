"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WS_URL } from "../../lib/api";
import { takeGameSocket } from "../../lib/gameSocket";
import { MultiplayerGameBoard } from "../../components/MultiplayerGameBoard";
import { GameCard, PlayerId } from "../../store/gameStore";

interface GameSession {
  myRole: PlayerId;
  myName: string;
  opponentName: string;
  myDeckCards: GameCard[];
  opponentDeckCards: GameCard[];
}

type PageState = "connecting" | "ready" | "error";

export default function GamePage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("connecting");
  const [session, setSession] = useState<GameSession | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("cardsim_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    // Read session data stored by the lobby
    const raw = sessionStorage.getItem("cardsim_game_session");
    if (!raw) {
      setErrorMsg("No se encontró sesión de juego. Vuelve al lobby.");
      setPageState("error");
      return;
    }

    let parsed: GameSession;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setErrorMsg("Datos de sesión inválidos.");
      setPageState("error");
      return;
    }

    // ── Try to reuse the lobby's WebSocket (still connected to the room) ──
    const existingSocket = takeGameSocket();

    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      // Reuse — the room is still active on the server, no REJOIN needed
      wsRef.current = existingSocket;
      setSession(parsed);
      setPageState("ready");
      return;
    }

    // ── Fallback: create a new WS and rejoin the room ──
    // (e.g. page was hard-refreshed)
    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = socket;

    socket.onopen = () => {
      const roomId = sessionStorage.getItem("cardsim_game_roomId");
      if (roomId) {
        socket.send(JSON.stringify({ type: "REJOIN_ROOM", payload: { id: roomId } }));
      }
      setSession(parsed);
      setPageState("ready");
    };

    socket.onerror = () => {
      setErrorMsg("Error de conexión con el servidor.");
      setPageState("error");
    };

    return () => {
      // Only close if we created this socket (not the reused lobby one)
      socket.close();
    };
  }, [router]);

  const handleExit = () => {
    wsRef.current?.close();
    sessionStorage.removeItem("cardsim_game_session");
    sessionStorage.removeItem("cardsim_game_roomId");
    router.push("/");
  };

  if (pageState === "connecting") {
    return (
      <div className="h-screen w-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-black text-xl mb-1">Conectando al servidor...</p>
          <p className="text-slate-500 text-sm">Preparando el campo de batalla</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="h-screen w-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <span className="text-red-400 text-3xl font-black">!</span>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-xl mb-2">Error al iniciar la partida</p>
          <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push("/lobby")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
          >
            Volver al Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!session || !wsRef.current) return null;

  return (
    <MultiplayerGameBoard
      ws={wsRef.current}
      myRole={session.myRole}
      myDeckCards={session.myDeckCards}
      opponentDeckCards={session.opponentDeckCards}
      myName={session.myName}
      opponentName={session.opponentName}
      onExit={handleExit}
    />
  );
}
