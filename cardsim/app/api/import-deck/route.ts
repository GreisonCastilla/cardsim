import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');

  console.log(">>> [FIRESTORE-IMPORT] Attempting to import deck:", deckId);

  if (!deckId) {
    return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
  }

  try {
    // Direct Firestore REST API URL for Gachi-Matome with API Key
    const apiKey = "AIzaSyDlTvNrkoUPd_0d9OpcZuiLkC6lAY-8J-M";
    const url = `https://firestore.googleapis.com/v1/projects/gachi-matome/databases/(default)/documents/version/2/dm_decks/${deckId}?key=${apiKey}`;
    
    console.log(">>> [FIRESTORE-IMPORT] Fetching from Firestore API...");

    const response = await fetch(url, {
      next: { revalidate: 0 }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(">>> [FIRESTORE-IMPORT] Failed:", response.status, errorBody);
        throw new Error(`Mazo no encontrado en la base de datos (Error ${response.status})`);
    }

    const data = await response.json();
    
    // Firestore returns data in a 'fields' object
    const fields = data.fields || {};
    
    // Extract name
    const deckName = fields.name?.stringValue || "Imported Deck";
    
    // Helper to extract card arrays from Firestore's nested format
    const extractCards = (field: any) => {
        if (!field || !field.arrayValue || !field.arrayValue.values) return [];
        return field.arrayValue.values.map((v: any) => {
            const cardObj = v.mapValue?.fields || {};
            return {
                name: cardObj.card_name?.stringValue || cardObj.name?.stringValue || "Unknown",
                count: parseInt(cardObj.count?.integerValue || "1"),
                is_hyper: cardObj.is_hyper?.booleanValue || false,
                is_gacharange: cardObj.is_gacharange?.booleanValue || false,
                is_legendary: cardObj.is_legendary?.booleanValue || false
            };
        });
    };

    const main = extractCards(fields.main_cards);
    const hyper = extractCards(fields.hyper_spatial_cards);
    const g = extractCards(fields.gr_cards);
    
    // For legendary pieces, sometimes they are flags or special keys
    const legendaryObj = fields.legendary || {};
    const legendary: any[] = [];
    
    return NextResponse.json({
      name: deckName,
      main: main,
      g: g,
      hyper: hyper,
      legendary: legendary
    });

  } catch (error: any) {
    console.error(">>> [FIRESTORE-IMPORT] Critical Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
