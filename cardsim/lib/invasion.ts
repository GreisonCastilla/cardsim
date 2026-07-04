import { GameCard } from '../store/gameStore';

export interface InvasionRequirement {
  civilizations: string[];
  races: string[];
  minCost: number | null;
  multicoloredOnly: boolean;
  nameIncludes: string | null;
  allowedZones: string[];
}

export function parseInvasionRequirement(card: GameCard): InvasionRequirement | null {
  const descEn = (card.descriptionEn || card.description || "").toLowerCase();
  const descJa = (card.descriptionJa || "");

  // Match pattern: Invasion—TYPE or 侵略
  const mEn = descEn.match(/invasion[:\s\-—–\u30fc]+([^(\n]+)/i);
  const mJa = descJa.match(/侵略[:\s\-—–\u30fc]+([^（(\n]+)/);

  if (!mEn && !mJa) return null;

  const reqTextEn = mEn ? mEn[1].trim() : "";
  const reqTextJa = mJa ? mJa[1].trim() : "";

  const req: InvasionRequirement = {
    civilizations: [],
    races: [],
    minCost: null,
    multicoloredOnly: false,
    nameIncludes: null,
    allowedZones: ['hand', 'gZone', 'hyperspatial'], // Default zones
  };

  // S-Rank Invasion checks
  if (descEn.includes('s-rank invasion') || descJa.includes('S級侵略')) {
    if (descEn.includes('graveyard') || descJa.includes('墓地')) {
      req.allowedZones.push('cemetery');
    }
    if (descEn.includes('mana') || descJa.includes('マナ')) {
      req.allowedZones.push('manaZone');
    }
    // "S-Rank Zombie" allows graveyard, "S-Rank Primitive" allows mana, etc.
    if (descEn.match(/s-rank zombie/i) || descJa.includes('デッドゾーン')) req.allowedZones.push('cemetery');
  }

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
  const costMatch = reqTextEn.match(/cost\s+(\d+)/) || reqTextJa.match(/(\d+)/);
  if (costMatch && (reqTextEn.includes('or more') || reqTextJa.includes('以上'))) {
    req.minCost = parseInt(costMatch[1]);
  }

  // 3. Races
  const commonRaces = [
    'dragon', 'command', 'giant', 'mecha', 'abyss', 'armored', 
    'sonic command', 'beast army', 'invader', 'eureka', 'magic', 'joker'
  ];
  
  commonRaces.forEach(r => {
    const regEn = new RegExp(`\\b${r}\\b`, 'i');
    if (regEn.test(reqTextEn)) {
      req.races.push(r);
    }
  });

  if (reqTextEn.toLowerCase().includes('dragon') && !req.races.includes('dragon')) {
    req.races.push('dragon');
  }
  
  const jaRaces = [
    { en: 'dragon', ja: 'ドラゴン' },
    { en: 'dragon', ja: '龍' },
    { en: 'dragon', ja: '竜' },
    { en: 'command', ja: 'コマンド' },
    { en: 'sonic command', ja: 'ソニック・コマンド' },
    { en: 'invader', ja: '侵略者' }
  ];
  
  jaRaces.forEach(r => {
    if (reqTextJa.includes(r.ja) && !req.races.includes(r.en)) {
      req.races.push(r.en);
    }
  });

  return req;
}

export function isEligibleForInvasion(attacker: GameCard, requirement: InvasionRequirement): boolean {
  if (requirement.minCost !== null) {
    const attackerCost = parseInt(String(attacker.manaCost || 0));
    if (attackerCost < requirement.minCost) return false;
  }

  if (requirement.civilizations.length > 0) {
    const attackerCiv = (attacker.civilization || "").toLowerCase();
    const matchesCiv = requirement.civilizations.some(c => {
      if (attackerCiv.includes(c)) return true;
      if (attackerCiv.includes('5 colors') || attackerCiv.includes('rainbow') || attackerCiv.includes('multicolor')) return true;
      return false;
    });
    if (!matchesCiv) return false;
  }

  if (requirement.races.length > 0) {
    const attackerRace = (attacker.raceEn || attacker.raceJa || "").toLowerCase();
    const attackerName = (attacker.nameEn || attacker.name || "").toLowerCase();
    
    const matchesRace = requirement.races.some(r => {
      if (r === 'dragon') {
        const dragonPatterns = ['dragon', 'ドラゴン', '龍', '竜', '竜装'];
        if (dragonPatterns.some(p => attackerRace.includes(p) || attackerName.includes(p))) return true;
      }
      return attackerRace.includes(r);
    });
    
    if (!matchesRace) return false;
  }

  return true;
}
