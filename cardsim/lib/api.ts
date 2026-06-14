const getBackendUrls = () => {
  if (typeof window === "undefined") {
    return {
      API_URL: "http://localhost:8080/api",
      WS_URL: "ws://localhost:8080/ws"
    };
  }
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  
  return {
    API_URL: `${protocol}//${host}:8080/api`,
    WS_URL: `${wsProtocol}//${host}:8080/ws`
  };
};

const urls = getBackendUrls();
export const API_URL = urls.API_URL;
export const WS_URL = urls.WS_URL;

export interface PaginatedCards {
  cards: any[];
  total: number;
  page: number;
  limit: number;
}

export interface CardFilters {
  civ?: string[];
  type?: string[];
  cost?: number;
  power?: number;
  race?: string;
  ability?: string[];
  rarity?: string;
  set?: string;
  doubleSided?: boolean;
}

export async function fetchCards(q: string = "", page: number = 1, limit: number = 20, lang: string = "", filters: CardFilters = {}): Promise<PaginatedCards> {
  const url = new URL(`${API_URL}/cards`);
  if (q) url.searchParams.set("q", q);
  if (lang) url.searchParams.set("lang", lang);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("limit", limit.toString());

  if (filters.civ) filters.civ.forEach(c => url.searchParams.append("civ", c));
  if (filters.type) filters.type.forEach(t => url.searchParams.append("type", t));
  if (filters.cost !== undefined && filters.cost !== -1) url.searchParams.set("cost", filters.cost.toString());
  if (filters.power !== undefined && filters.power !== -1) url.searchParams.set("power", filters.power.toString());
  if (filters.race) url.searchParams.set("race", filters.race);
  if (filters.ability) filters.ability.forEach(a => url.searchParams.append("ability", a));
  if (filters.rarity) url.searchParams.set("rarity", filters.rarity);
  if (filters.set) url.searchParams.set("set", filters.set);
  if (filters.doubleSided) url.searchParams.set("doubleSided", "true");

  const res = await fetch(url.toString(), {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error("Failed to fetch cards");
  return res.json();
}

export async function fetchCardsByNames(names: string[]): Promise<Record<string, any>> {
  const res = await fetch(`${API_URL}/cards/by-names`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw new Error("Failed to fetch cards by names");
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

export async function updateCard(card: any, originalIdentity?: {nameJa: string, image: string}) {
  // Convert GameCard (frontend) back to models.Card (backend) structure
  const backendCard = {
    name_ja: card.nameJa || card.name,
    name_en: card.nameEn || "",
    image_url: card.image || "",
    civilization: card.civilization || "",
    mana: card.mana || "",
    power: card.attack?.toString() || "",
    cost: card.manaCost?.toString() || "",
    abilities_ja: card.descriptionJa || "",
    abilities_en: card.descriptionEn || "",
    type_ja: card.typeJa || "",
    type_en: card.typeEn || "",
    race_ja: card.raceJa || "",
    race_en: card.raceEn || "",
    illustrator: card.illustrator || "",
    rarity: card.rarity || "",
    sets: card.sets || [],
    primary_set: card.primary_set || "",
    source_url: card.source_url || "",
    hyper_power: card.hyperpower || "",
    backs: (card.backs || []).map((b: any) => ({
      name: b.name || "",
      image_url: b.image_url || "",
      mana: b.mana || "",
      power: b.power || "",
      cost: b.cost || b.mana || "",
      abilities_ja: b.abilities_ja || "",
      abilities_en: b.abilities_en || "",
      type_ja: b.type_ja || "",
      type_en: b.type_en || "",
      race_ja: b.race_ja || "",
      race_en: b.race_en || "",
      civilization: b.civilization || "",
      hyper_power: b.hyper_power || ""
    }))
  };

  const payload = {
    card: backendCard,
    original_name: originalIdentity?.nameJa || backendCard.name_ja,
    original_image: originalIdentity?.image || backendCard.image_url
  };

  const res = await fetch(`${API_URL}/cards/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update card: ${errorText}`);
  }

  return true;
}

export async function addCard(card: any) {
  // Convert GameCard (frontend) back to models.Card (backend) structure
  const backendCard = {
    name_ja: card.nameJa || card.name || "New Card",
    name_en: card.nameEn || "",
    image_url: card.image || "",
    civilization: card.civilization || "",
    mana: card.mana || "",
    power: card.attack?.toString() || "",
    cost: card.manaCost?.toString() || "",
    abilities_ja: card.descriptionJa || "",
    abilities_en: card.descriptionEn || "",
    type_ja: card.typeJa || "",
    type_en: card.typeEn || "",
    race_ja: card.raceJa || "",
    race_en: card.raceEn || "",
    illustrator: card.illustrator || "",
    rarity: card.rarity || "",
    sets: card.sets || [],
    primary_set: card.primary_set || "",
    source_url: card.source_url || "",
    hyper_power: card.hyperpower || "",
    backs: (card.backs || []).map((b: any) => ({
      name: b.name || "",
      image_url: b.image_url || "",
      mana: b.mana || "",
      power: b.power || "",
      cost: b.cost || b.mana || "",
      abilities_ja: b.abilities_ja || "",
      abilities_en: b.abilities_en || "",
      type_ja: b.type_ja || "",
      type_en: b.type_en || "",
      race_ja: b.race_ja || "",
      race_en: b.race_en || "",
      civilization: b.civilization || "",
      hyper_power: b.hyper_power || ""
    }))
  };

  const res = await fetch(`${API_URL}/cards/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backendCard),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to add card: ${errorText}`);
  }

  return true;
}
