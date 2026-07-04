import { GameCard } from '../store/gameStore';

export interface RevolutionChangeRequirement {
  civilizations: string[];
  races: string[];
  minCost: number | null;
  multicoloredOnly: boolean;
  nameIncludes: string | null;
}

export function parseRevolutionChangeRequirement(card: GameCard): RevolutionChangeRequirement | null {
  const descEn = (card.descriptionEn || card.description || "").toLowerCase();
  const descJa = (card.descriptionJa || "");

  // Match pattern: Revolution Change—TYPE (Reminder Text)
  // We look for the part before the parenthesis
  const mEn = descEn.match(/revolution change[:\s\-—–\u30fc]+([^(\n]+)/);
  const mJa = descJa.match(/革命チェンジ[:\s\-—–\u30fc]+([^（(\n]+)/);

  if (!mEn && !mJa) return null;

  const reqTextEn = mEn ? mEn[1].trim() : "";
  const reqTextJa = mJa ? mJa[1].trim() : "";

  const req: RevolutionChangeRequirement = {
    civilizations: [],
    races: [],
    minCost: null,
    multicoloredOnly: false,
    nameIncludes: null,
  };

  // 1. Civilizations
  const civMap = [
    { en: 'light', ja: '光' },
    { en: 'water', ja: '水' },
    { en: 'darkness', ja: '闇' },
    { en: 'fire', ja: '火' },
    { en: 'nature', ja: '自然' },
    { en: 'colorless', ja: 'ゼロ' }
  ];

  civMap.forEach(c => {
    const regEn = new RegExp(`\\b${c.en}\\b`, 'i');
    if (regEn.test(reqTextEn) || reqTextJa.includes(c.ja)) {
      req.civilizations.push(c.en);
    }
  });

  // 2. Cost
  const costMatch = reqTextEn.match(/costs?\s+(\d+)/i) || reqTextJa.match(/(\d+)/);
  if (costMatch && (reqTextEn.includes('or more') || reqTextJa.includes('以上'))) {
    req.minCost = parseInt(costMatch[1]);
  }

  // 3. Multicolored
  if (reqTextEn.includes('multicolored') || reqTextJa.includes('多色')) {
    req.multicoloredOnly = true;
  }

  // 4. Name check (e.g. Bolshack)
  const nameMatch = reqTextEn.match(/has\s+"([^"]+)"\s+in\s+its\s+name/i);
  if (nameMatch) {
    req.nameIncludes = nameMatch[1].toLowerCase();
  }

  // 5. Races
  // We'll look for common race keywords. 
  // If no specific race is found but "creature" is used, we leave it empty (matches any).
  const commonRaces = [
    'dragon', 'dragon world', 'command', 'revolutionary', 'magic', 'giant', 'mecha', 
    'abyss', 'armored', 'fire bird', 'dreammate', 'joker', 'zenith', 'unknown', 
    'death puppet', 'splash queen', 'hamukatsu', 'initials', 'sonic command',
    'mega command dragon', 'armored dragon', 'earth dragon', 'zombie dragon',
    'spirit quartz', 'angel command', 'demon command', 'beast folk', 'dragonoid',
    'human', 'cyber lord', 'cyber virus', 'liquid people', 'rock beast'
  ];
  
  commonRaces.forEach(r => {
    const regEn = new RegExp(`\\b${r}\\b`, 'i');
    if (regEn.test(reqTextEn)) {
      req.races.push(r);
    }
  });

  // Special check for "Dragon" as it's the most common and can be part of many words
  if (reqTextEn.toLowerCase().includes('dragon') && !req.races.includes('dragon')) {
    req.races.push('dragon');
  }
  
  // Japanese race detection is harder but we can add some key ones
  const jaRaces = [
    { en: 'dragon', ja: 'ドラゴン' },
    { en: 'dragon', ja: '龍' },
    { en: 'dragon', ja: '竜' },
    { en: 'magic', ja: 'マジック' },
    { en: 'giant', ja: 'ジャイアント' },
    { en: 'mecha', ja: 'メカ' },
    { en: 'abyss', ja: 'アビス' },
    { en: 'armored', ja: 'アーマード' },
    { en: 'joker', ja: 'ジョーカーズ' },
    { en: 'command', ja: 'コマンド' },
    { en: 'revolutionary', ja: '革命軍' },
    { en: 'revolutionary', ja: 'レボリューション' }
  ];
  
  jaRaces.forEach(r => {
    if (reqTextJa.includes(r.ja) && !req.races.includes(r.en)) {
      req.races.push(r.en);
    }
  });

  // If nothing was found but the text exists, it might be a specific race not in our list.
  // We can try to extract words that are not civs or cost-related.
  if (req.races.length === 0 && !reqTextEn.includes('creature') && reqTextEn.length > 0) {
     // Fallback: split by 'or' / 'and' / ' ' and take capitalized words? 
     // For now, let's stick to the common list or add logic as needed.
  }

  return req;
}

export function isEligibleForRevolutionChange(attacker: GameCard, requirement: RevolutionChangeRequirement): boolean {
  // 1. Cost Check
  if (requirement.minCost !== null) {
    const attackerCost = parseInt(String(attacker.manaCost || 0));
    if (attackerCost < requirement.minCost) return false;
  }

  // 2. Multicolored Check
  if (requirement.multicoloredOnly) {
    const civs = (attacker.civilization || "").split(/[/,]/);
    if (civs.length < 2) return false;
  }

  // 3. Name Check
  if (requirement.nameIncludes) {
    const name = (attacker.nameEn || attacker.name || "").toLowerCase();
    if (!name.includes(requirement.nameIncludes)) return false;
  }

  // 4. Civilization Check
  if (requirement.civilizations.length > 0) {
    const attackerCiv = (attacker.civilization || "").toLowerCase();
    
    const civMap: Record<string, string[]> = {
      'light': ['light', '光'],
      'water': ['water', '水'],
      'darkness': ['darkness', '闇'],
      'fire': ['fire', '火'],
      'nature': ['nature', '自然'],
      'colorless': ['colorless', 'ゼロ', '無色']
    };

    // Check if attacker has ANY of the required civilizations
    const matchesCiv = requirement.civilizations.some(c => {
      const keywords = civMap[c] || [c];
      if (keywords.some(k => attackerCiv.includes(k))) return true;
      
      // Handle "5 colors" or "multicolored" indicators
      if (attackerCiv.includes('5 colors') || attackerCiv.includes('rainbow') || attackerCiv.includes('multicolor') || attackerCiv.includes('多色')) return true;
      return false;
    });
    
    if (!matchesCiv) return false;
  }

  // 5. Race Check
  if (requirement.races.length > 0) {
    const attackerRace = (attacker.raceEn || attacker.raceJa || "").toLowerCase();
    const attackerName = (attacker.nameEn || attacker.name || "").toLowerCase();
    
    const raceMap: Record<string, string[]> = {
      'dragon': ['dragon', 'ドラゴン', '龍', '竜', '竜装'],
      'command': ['command', 'コマンド'],
      'revolutionary': ['revolutionary', '革命軍', 'レボリューション'],
      'magic': ['magic', 'マジック'],
      'giant': ['giant', 'ジャイアント'],
      'mecha': ['mecha', 'メカ'],
      'abyss': ['abyss', 'アビス'],
      'armored': ['armored', 'アーマード'],
      'joker': ['joker', 'ジョーカーズ']
    };

    const matchesRace = requirement.races.some(r => {
      const keywords = raceMap[r] || [r];
      return keywords.some(k => attackerRace.includes(k) || attackerName.includes(k));
    });
    
    if (!matchesRace) return false;
  }

  return true;
}
