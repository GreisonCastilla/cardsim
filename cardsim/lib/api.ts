export const API_URL = "http://localhost:8080/api";
export const WS_URL = "ws://localhost:8080/ws";

export interface PaginatedCards {
  cards: any[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchCards(q: string = "", page: number = 1, limit: number = 20, lang: string = ""): Promise<PaginatedCards> {
  const url = new URL(`${API_URL}/cards`);
  if (q) url.searchParams.set("q", q);
  if (lang) url.searchParams.set("lang", lang);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("limit", limit.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch cards");
  return res.json();
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error("Failed to register");
  return res.json();
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Failed to login");
  return res.json();
}

export async function fetchDecks(): Promise<any[]> {
  const token = localStorage.getItem("cardsim_token");
  if (!token) return [];

  const res = await fetch(`${API_URL}/decks`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch decks");
  return res.json();
}

export async function saveDeck(deck: any) {
  const token = localStorage.getItem("cardsim_token");
  if (!token) return;

  const res = await fetch(`${API_URL}/decks`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify(deck),
  });
  if (!res.ok) throw new Error("Failed to save deck");
  return true;
}

export async function deleteDeck(deckId: string | number) {
  const token = localStorage.getItem("cardsim_token");
  if (!token) return;

  const res = await fetch(`${API_URL}/decks?id=${deckId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete deck");
  return true;
}
