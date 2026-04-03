"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WS_URL } from "../../lib/api";

type RoomInfo = {
  id: string;
  name: string;
  has_password: boolean;
  players: number;
  max_players: number;
};

type JoinedRoomInfo = {
  id: string;
  name: string;
  isHost: boolean;
  hostName?: string;
  guestName?: string;
  hostReady?: boolean;
  guestReady?: boolean;
};

type ChatMessage = {
  sender: string;
  text: string;
};

export default function LobbyPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<JoinedRoomInfo | null>(null);
  
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPassword, setNewRoomPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [amIReady, setAmIReady] = useState(false);
  const [isOpponentReady, setIsOpponentReady] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [decks, setDecks] = useState<{id: string, name: string}[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [opponentDeckName, setOpponentDeckName] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cardsim_decks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDecks(parsed);
          setSelectedDeckId(parsed[0].id);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

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
      try {
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, `Action: ${msg.type}`]);
        handleWSMessage(msg);
      } catch (e) {
        setMessages((prev) => [...prev, `Raw: ${event.data}`]);
      }
    };
    socket.onclose = () => {
      setMessages((prev) => [...prev, "Disconnected"]);
    };

    setWs(socket);

    return () => socket.close();
  }, [router]);

  useEffect(() => {
    if (currentRoom && selectedDeckId && ws && ws.readyState === WebSocket.OPEN) {
      const d = decks.find(deck => deck.id === selectedDeckId);
      if (d) {
        ws.send(JSON.stringify({ type: "SELECT_DECK", payload: { deckName: d.name } }));
      }
    }
  }, [currentRoom?.id, selectedDeckId, ws]);

  const handleWSMessage = (msg: any) => {
    switch (msg.type) {
      case "ROOM_LIST":
        setRooms(msg.payload || []);
        break;
      case "ROOM_CREATED":
      case "ROOM_JOINED":
        setCurrentRoom(msg.payload);
        setAmIReady(false);
        setIsOpponentReady(false);
        setChatMessages([]);
        setOpponentDeckName("");
        break;
      case "GUEST_JOINED":
        setCurrentRoom((prev) => prev ? { ...prev, guestName: msg.payload.guestName } : null);
        break;
      case "GUEST_LEFT":
        setCurrentRoom((prev) => prev ? { ...prev, guestName: undefined, guestReady: false, hostReady: false } : null);
        setIsOpponentReady(false);
        setAmIReady(false);
        setOpponentDeckName("");
        setMessages((prev) => [...prev, "Opponent left the room."]);
        break;
      case "ROOM_CLOSED":
        setCurrentRoom(null);
        setAmIReady(false);
        setIsOpponentReady(false);
        setOpponentDeckName("");
        setMessages((prev) => [...prev, "The room host closed the room."]);
        break;
      case "ERROR":
        setMessages((prev) => [...prev, `Error: ${msg.payload}`]);
        alert(`Error: ${msg.payload}`);
        break;
      case "READY_STATE":
        setAmIReady(msg.payload);
        break;
      case "OPPONENT_READY":
        setIsOpponentReady(msg.payload);
        break;
      case "OPPONENT_DECK":
        setOpponentDeckName(msg.payload);
        break;
      case "CHAT_MESSAGE":
        setChatMessages((prev) => [...prev, msg.payload]);
        break;
      case "GAME_START":
        alert("GAME STARTING!");
        router.push("/game"); // Navigate to actual game component
        break;
      default:
        console.log("Unhandled via json:", msg);
        break;
    }
  };

  const createRoom = () => {
    const finalName = newRoomName.trim() || `Room ${Math.floor(Math.random() * 1000)}`;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return alert("Connection lost. Please refresh the page to reconnect to the server.");
    }
    ws.send(JSON.stringify({
      type: "CREATE_ROOM",
      payload: { name: finalName, password: newRoomPassword }
    }));
  };

  const joinRoom = (room: RoomInfo) => {
    if (room.has_password && selectedRoomId !== room.id) {
      setSelectedRoomId(room.id);
      return;
    }
    ws?.send(JSON.stringify({
      type: "JOIN_ROOM",
      payload: { id: room.id, password: joinPassword }
    }));
  };

  const leaveRoom = () => {
    ws?.send(JSON.stringify({ type: "LEAVE_ROOM" }));
    setCurrentRoom(null);
    setAmIReady(false);
    setIsOpponentReady(false);
    setChatMessages([]);
  };

  const toggleReady = () => {
    if (!selectedDeckId) {
      alert("Please create or select a deck first! You can't play without a deck.");
      return;
    }
    ws?.send(JSON.stringify({ type: "READY" }));
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !ws) return;
    ws.send(JSON.stringify({ type: "ROOM_CHAT", payload: { text: chatInput.trim() } }));
    setChatInput("");
  };

  if (currentRoom) {
    const myUsername = typeof window !== 'undefined' ? (() => {
      try {
        const token = localStorage.getItem("cardsim_token");
        if (token) { const p = JSON.parse(atob(token.split('.')[1])); return p.username || ""; }
      } catch {}
      return "";
    })() : "";

    return (
      <div className="h-screen w-screen bg-[#0b0f1a] text-white flex flex-col overflow-hidden" style={{fontFamily: "'Inter', sans-serif"}}>
        {/* Top bar */}
        <header className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-b border-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            <h1 className="text-lg font-black tracking-tight text-white">
              {currentRoom.name}
              <span className="ml-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Room</span>
            </h1>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-lg font-bold text-sm transition-all"
            onClick={leaveRoom}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5" /></svg>
            Leave
          </button>
        </header>

        {/* Main content: left = players, right = chat */}
        <div className="flex flex-1 overflow-hidden gap-0">

          {/* LEFT: Player panels + Ready button */}
          <div className="w-[45%] flex flex-col gap-4 p-6 overflow-y-auto">

            {/* YOU */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/20 rounded-2xl p-5 shadow-xl ring-1 ring-white/5">
              <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {currentRoom.isHost ? "Host" : "Guest"} · You
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-lg shadow-lg">
                  {(currentRoom.isHost ? (currentRoom.hostName ?? "?") : (currentRoom.guestName ?? "?")).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-base leading-tight">{currentRoom.isHost ? currentRoom.hostName : currentRoom.guestName || "Me"}</p>
                  <p className="text-xs text-slate-500">You</p>
                </div>
              </div>

              {/* Deck selector */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">🃏 Your Deck</label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none bg-slate-950/60 border rounded-xl px-4 py-3 pr-10 outline-none text-sm font-bold transition-all cursor-pointer ${
                      amIReady
                        ? "border-slate-700 text-slate-500 cursor-not-allowed"
                        : "border-blue-500/40 text-blue-300 hover:border-blue-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                    }`}
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    disabled={amIReady}
                  >
                    {decks.length === 0 && <option value="">No Decks Found</option>}
                    {decks.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {decks.length === 0 && (
                  <button onClick={() => router.push('/deck-builder')} className="mt-2 text-xs text-red-400 hover:text-red-300 hover:underline w-full text-center">
                    Build a deck first →
                  </button>
                )}
              </div>

              {/* Ready status badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                amIReady
                  ? "bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                  : "bg-slate-700/50 border-slate-600/50 text-slate-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${amIReady ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                {amIReady ? "Ready" : "Not Ready"}
              </div>
            </div>

            {/* OPPONENT */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-2xl p-5 shadow-xl ring-1 ring-white/5">
              <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                {currentRoom.isHost ? "Guest" : "Host"} · Opponent
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center font-black text-lg shadow-lg">
                  {(!currentRoom.isHost ? (currentRoom.hostName ?? "?") : (currentRoom.guestName ?? "?")).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-base leading-tight">
                    {!currentRoom.isHost ? currentRoom.hostName : currentRoom.guestName || "Waiting..."}
                  </p>
                  <p className="text-xs text-slate-500">Opponent</p>
                </div>
              </div>

              {/* Opponent deck display */}
              {(!currentRoom.isHost || currentRoom.guestName) && (
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">🃏 Their Deck</label>
                  <div className="w-full bg-slate-950/60 border border-purple-500/20 rounded-xl px-4 py-3 text-sm font-bold text-purple-300 shadow-inner flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="truncate">{opponentDeckName || "Selecting..."}</span>
                  </div>
                </div>
              )}

              {/* Opponent ready badge */}
              {currentRoom.isHost && !currentRoom.guestName ? (
                <p className="text-sm text-slate-500 italic animate-pulse">Waiting for opponent to join...</p>
              ) : (
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                  isOpponentReady
                    ? "bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                    : "bg-slate-700/50 border-slate-600/50 text-slate-400"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOpponentReady ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                  {isOpponentReady ? "Ready" : "Waiting"}
                </div>
              )}
            </div>

            {/* Ready button */}
            <div>
              {(!currentRoom.isHost || currentRoom.guestName) && (
                <button
                  onClick={toggleReady}
                  className={`w-full py-4 rounded-xl font-black text-base transition-all tracking-wide ${
                    amIReady
                      ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.35)]"
                  } active:scale-95`}
                >
                  {amIReady ? "⚡ Cancel Ready" : "✅ Ready Up!"}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Chat */}
          <div className="flex-1 flex flex-col border-l border-white/5 bg-slate-900/50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-slate-900/80 shrink-0">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <span className="font-black text-sm uppercase tracking-widest text-slate-300">Room Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {chatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 opacity-40">
                  <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No messages yet</p>
                  <p className="text-xs text-slate-600">Say hi to your opponent!</p>
                </div>
              ) : (
                chatMessages.map((cm, i) => {
                  const isMe = cm.sender === myUsername;
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center font-black text-xs mr-2 mt-1 shrink-0">
                          {cm.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">{cm.sender}</span>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm shadow-[0_4px_15px_rgba(59,130,246,0.3)]"
                            : "bg-slate-700/80 border border-white/5 text-slate-100 rounded-bl-sm"
                        }`}>
                          {cm.text}
                        </div>
                      </div>
                      {isMe && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-xs ml-2 mt-1 shrink-0">
                          {cm.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChat} className="flex items-center gap-2 p-4 border-t border-white/5 bg-slate-900/80 shrink-0">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 text-sm transition-all placeholder:text-slate-600"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-sm transition-all shadow-[0_4px_15px_rgba(59,130,246,0.3)] active:scale-95"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 w-full">
        <h1 className="text-3xl font-bold text-purple-400">Match Lobby</h1>
        <button className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600" onClick={() => router.push("/")}>Back to Menu</button>
      </div>

      <div className="grid md:grid-cols-4 gap-6 w-full flex-1">
        <div className="md:col-span-3 bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col w-full h-full">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700 pb-2">Available Rooms</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {rooms.length === 0 ? (
              <p className="text-slate-400 italic text-center mt-10">No rooms available. Create one to play!</p>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="bg-slate-700 p-4 rounded-lg flex items-center justify-between border-l-4 border-purple-500">
                  <div>
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      {room.name}
                      {room.has_password && <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">🔒 Pass</span>}
                    </h3>
                    <p className="text-slate-300 text-sm">Players: {room.players}/{room.max_players}</p>
                  </div>
                  
                  {selectedRoomId === room.id && room.has_password ? (
                    <div className="flex gap-2 items-center">
                      <input 
                        type="password" 
                        placeholder="Password" 
                        className="bg-slate-800 px-3 py-2 rounded border border-slate-600 outline-none focus:border-purple-500 w-32 text-sm"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                      />
                      <button 
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold text-sm"
                        onClick={() => joinRoom(room)}
                      >
                        Join
                      </button>
                    </div>
                  ) : (
                    <button 
                      className={`px-6 py-2 rounded font-bold text-sm ${room.players >= room.max_players ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-lg'}`}
                      onClick={() => room.players < room.max_players && joinRoom(room)}
                      disabled={room.players >= room.max_players}
                    >
                      {room.players >= room.max_players ? "Full" : (room.has_password ? "Enter Pass" : "Join")}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-green-400">Create New Room</h2>
            <form 
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); createRoom(); }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 outline-none focus:border-green-500"
                  placeholder="My Epic Match"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password (Optional)</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 outline-none focus:border-green-500"
                  placeholder="Leave blank for public"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold text-white shadow-lg transition-colors mt-2"
              >
                Create Room
              </button>
            </form>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg overflow-y-auto h-48 font-mono text-xs leading-relaxed text-green-400 border border-slate-700">
            <h2 className="text-sm font-bold mb-2 text-slate-300 uppercase tracking-wider">Server Logs</h2>
            {messages.slice(-10).map((m, i) => (
              <div key={i} className="mb-1">{m}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
