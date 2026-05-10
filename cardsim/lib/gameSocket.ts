/**
 * gameSocket.ts
 * 
 * Persists the WebSocket connection across page navigations (lobby → game).
 * This prevents the lobby WS from closing and destroying the room on the server
 * when the user navigates to /game.
 */

let _socket: WebSocket | null = null;

export function saveGameSocket(ws: WebSocket) {
  _socket = ws;
}

export function takeGameSocket(): WebSocket | null {
  const s = _socket;
  _socket = null;
  return s;
}

export function peekGameSocket(): WebSocket | null {
  return _socket;
}
