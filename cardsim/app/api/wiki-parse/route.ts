import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wikiUrl = searchParams.get('url');

  if (!wikiUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const pageName = wikiUrl.split('/wiki/')[1]?.split('?')[0];
    if (!pageName) {
        throw new Error("URL inválida. Debe ser un link de duelmasters.fandom.com/wiki/");
    }

    const apiUrl = `https://duelmasters.fandom.com/api.php?action=parse&page=${pageName}&format=json&prop=text`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Error al consultar la Wiki API");

    const data = await response.json();
    if (data.error) throw new Error(data.error.info || "Página no encontrada");

    const html = data.parse.text['*'];
    
    const cleanHtml = (text: string) => {
        if (!text) return "";
        return text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<li[^>]*>/gi, '■ ')
            .replace(/<\/li>/gi, '\n')
            .replace(/<hr\s*\/?>/gi, '\n')
            .replace(/<ruby[^>]*>([\s\S]*?)<\/ruby>/gi, (_, inner) => {
                // Extract just the base text from ruby annotations
                const rbMatch = inner.match(/<rb>([\s\S]*?)<\/rb>/i);
                return rbMatch ? rbMatch[1] : inner.replace(/<[^>]*>/g, '');
            })
            .replace(/<abbr[^>]*title="([^"]*)"[^>]*>[^<]*<\/abbr>/gi, (_, __, ___, full) => {
                // Keep the visible text, not the title
                return full;
            })
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#8203;/g, '') // Remove zero-width spaces
            .replace(/\n\s*\n/g, '\n')
            .trim();
    };

    // The wiki uses a <table class="wikitable"> with <tr> rows.
    // First <td> = label (bold text), Second <td> = value
    const extractTableField = (label: string) => {
        // The label appears inside <span> or <b> tags in the first <td>
        // Pattern: <td...>...<span...>LABEL</span>...</td>\s*<td>VALUE</td>
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try exact match first
        const regex = new RegExp(
            `<td[^>]*>[\\s\\S]*?>${escapedLabel}<[\\s\\S]*?</td>\\s*(?:</tr>\\s*)?<td[^>]*>([\\s\\S]*?)</td>`,
            'i'
        );
        const match = html.match(regex);
        if (match) return cleanHtml(match[1]);

        // Fallback: look for the label text anywhere in a <td> followed by the value <td>
        const regex2 = new RegExp(
            `<td[^>]*>[\\s\\S]*?${escapedLabel}[\\s\\S]*?</td>\\s*<td[^>]*?>([\\s\\S]*?)</td>`,
            'i'
        );
        const match2 = html.match(regex2);
        if (match2) return cleanHtml(match2[1]);

        return "";
    };

    // Extract card name from the header
    const nameEn = data.parse.title;

    // Extract Japanese name from header <small> tag or Japanese (base) row
    let nameJa = "";
    const jaBaseMatch = html.match(/Japanese \(base\):<\/b>\s*<\/td>\s*<td><small>([^<]*)<\/small>/i);
    if (jaBaseMatch) {
        nameJa = jaBaseMatch[1].trim();
    } else {
        // Fallback: get from the header
        const headerSmallMatch = html.match(/<th[^>]*>[\s\S]*?<small>([\s\S]*?)<\/small>\s*<\/div>/i);
        if (headerSmallMatch) {
            nameJa = cleanHtml(headerSmallMatch[1]);
        }
    }

    const civilization = extractTableField("Civilization");
    const type = extractTableField("Card Type");
    const cost = extractTableField("Mana Cost");
    const power = extractTableField("Power");
    const hyperPower = extractTableField("Hyper Power");
    const illustrator = extractTableField("Illustrator");

    // Race extraction - special handling because "Race" and "s" might be in separate spans
    let race = "";
    const raceMatch = html.match(/<td[^>]*>[\s\S]*?Race[\s\S]*?<\/td>\s*<td[^>]*?>([\s\S]*?)<\/td>/i);
    if (raceMatch) {
        race = cleanHtml(raceMatch[1]);
    }

    // English Text extraction - it's in a <td> after the "English Text" label <td>
    let abilitiesEn = "";
    const enTextMatch = html.match(/<td[^>]*>[\s\S]*?English Text[\s\S]*?<\/td>\s*<td[^>]*?>([\s\S]*?)<\/td>/i);
    if (enTextMatch) {
        abilitiesEn = cleanHtml(enTextMatch[1]);
    }

    // Japanese Text extraction
    let abilitiesJa = "";
    const jaTextMatch = html.match(/<td[^>]*>[\s\S]*?Japanese Text[\s\S]*?<\/td>\s*<td[^>]*?>([\s\S]*?)<\/td>/i);
    if (jaTextMatch) {
        abilitiesJa = cleanHtml(jaTextMatch[1]);
    }

    // Rarity extraction - from the "Sets and Rarity" section
    let rarity = "";
    const rarityMatch = html.match(/—\s*<a[^>]*>([^<]*)<\/a>\s*<span/i);
    if (rarityMatch) {
        rarity = rarityMatch[1].trim();
    } else {
        // Try alternative pattern
        const rarityMatch2 = html.match(/—\s*<a[^>]*title="([^"]*)"[^>]*>/i);
        if (rarityMatch2) {
            rarity = rarityMatch2[1].trim();
        }
    }

    // Extract primary set name
    let primarySet = "";
    const setMatch = html.match(/class="mw-collapsible[^"]*"[^>]*>\s*<b><a[^>]*>([^<]*)<\/a><\/b>/i);
    if (setMatch) {
        primarySet = setMatch[1].trim();
    }

    // Extract image
    let imageUrl = "";
    const imageMatch = html.match(/src="(https:\/\/static\.wikia\.nocookie\.net\/duelmasters\/images\/[^"]*?)(?:\/revision\/[^"]*)?"/i);
    if (imageMatch) {
        // Get the clean URL without revision/scale params
        imageUrl = imageMatch[1].split('/revision')[0];
    }

    return NextResponse.json({
        name: nameEn,
        name_ja: nameJa,
        type: type,
        civilization: civilization,
        cost: cost,
        power: power,
        hyper_power: hyperPower,
        race: race,
        rarity: rarity,
        illustrator: illustrator,
        abilities_en: abilitiesEn,
        abilities_ja: abilitiesJa,
        image: imageUrl,
        source_url: wikiUrl,
        primary_set: primarySet
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
