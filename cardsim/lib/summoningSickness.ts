/**
 * summoningSickness.ts
 *
 * Sistema de reconocimiento de "summoning sickness" para criaturas en Duel Masters.
 *
 * Reglas basadas en la wiki oficial:
 * https://duelmasters.fandom.com/wiki/Speed_Attacker
 * https://duelmasters.fandom.com/wiki/Mach_Fighter
 * https://duelmasters.fandom.com/wiki/Fury_Charge
 * https://duelmasters.fandom.com/wiki/Untap_Killer
 *
 * Resumen de reglas:
 * ┌─────────────────────────────┬──────────┬──────────────┬───────────────────┐
 * │ Keyword / Condición         │ Jugador  │ Crit. Tapped │ Crit. Untapped    │
 * ├─────────────────────────────┼──────────┼──────────────┼───────────────────┤
 * │ Sin keyword (normal)        │ No       │ No           │ No                │
 * │ Speed Attacker              │ Sí       │ Sí           │ No                │
 * │ Mach Fighter                │ No       │ Sí           │ Sí (sólo ese turn)│
 * │ Fury Charge                 │ No       │ Sí           │ No                │
 * │ Untap Killer (CIP/turn)     │ No       │ No           │ Sí (solo ese turn)│
 * │ Evolution Creature          │ Sí       │ Sí           │ No (speed att.)   │
 * └─────────────────────────────┴──────────┴──────────────┴───────────────────┘
 *
 * NOTA: Las criaturas Evolution NO tienen summoning sickness por defecto
 * (equivalen a Speed Attacker), PERO si tienen adicionalmente "speed attacker"
 * en su texto, es redundante.
 */

import { GameCard } from '../store/gameStore';

// ─── Tipos de ataque que puede realizar en el turno de ingreso ───────────────

export type AttackCapabilityOnEntry =
  | 'none'          // No puede atacar nada (summoning sickness normal)
  | 'full'          // Speed Attacker: puede atacar al jugador y criaturas tapeadas
  | 'tapped_only'   // Fury Charge: sólo criaturas tapeadas
  | 'creatures'     // Mach Fighter: criaturas tapeadas O no tapeadas (pero no jugador)
  | 'untapped_only' // Untap Killer (CIP/this turn): sólo criaturas no tapeadas

// ─── Resultado del análisis ──────────────────────────────────────────────────

export interface SummoningSicknessInfo {
  /** ¿La criatura tiene summoning sickness (no puede atacar libremente al entrar)? */
  hasSickness: boolean;
  /** Tipo de ataque permitido en el turno de ingreso */
  attackOnEntry: AttackCapabilityOnEntry;
  /** Keywords detectadas que modifican el comportamiento */
  detectedKeywords: string[];
  /** ¿Es criatura Evolution? (no tiene summoning sickness por regla base) */
  isEvolution: boolean;
}

// ─── Utilidad: Leer todos los textos de descripción/habilidades ──────────────

function getAllDescriptions(card: GameCard): { en: string; ja: string } {
  const en = [
    card.descriptionEn || '',
    card.description || '',
  ].join(' ').toLowerCase();

  const ja = [
    card.descriptionJa || '',
  ].join(' ');

  return { en, ja };
}

// ─── Detección de keywords individuales ─────────────────────────────────────

/**
 * Speed Attacker:
 * "This creature doesn't get summoning sickness."
 * "speed attacker" / "スピードアタッカー"
 */
function hasSpeedAttacker(desc: { en: string; ja: string }): boolean {
  return (
    desc.en.includes('speed attacker') ||
    desc.en.includes('doesn\'t get summoning sickness') ||
    desc.en.includes('does not get summoning sickness') ||
    desc.ja.includes('スピードアタッカー') ||
    desc.ja.includes('召喚酔いしない')
  );
}

/**
 * Mach Fighter:
 * "This creature can attack tapped or untapped creatures on the turn you put it."
 * "マッハファイター"
 */
function hasMachFighter(desc: { en: string; ja: string }): boolean {
  return (
    desc.en.includes('mach fighter') ||
    desc.en.includes('attack tapped or untapped creatures on the turn') ||
    desc.ja.includes('マッハファイター') ||
    desc.ja.includes('タップまたはアンタップしているクリーチャーを攻撃できる')
  );
}

/**
 * Fury Charge:
 * "This creature can attack tapped creatures on the turn it enters the battle zone."
 * Only appears on Tatsurion (DMX-12), but the keyword is recognized by text.
 * "フューリー・チャージ"
 */
function hasFuryCharge(desc: { en: string; ja: string }): boolean {
  return (
    desc.en.includes('fury charge') ||
    desc.en.includes('attack tapped creatures on the turn it enters') ||
    desc.ja.includes('フューリー・チャージ')
  );
}

/**
 * Untap Killer (con efecto "this turn" / CIP):
 * Criaturas que tienen "this creature can attack untapped creatures" como habilidad
 * que se activa el turno de entrada (CIP: "when you put this creature into the battle zone").
 * 
 * IMPORTANTE: Si NO especifica "this turn" es un efecto permanente, NO un efecto de entrada.
 * En ese caso, la criatura AÚN tiene summoning sickness el turno que entra.
 *
 * Detectamos dos variantes:
 * 1. Habilidad CIP (Come Into Play) con "this turn" — permite atacar untapped ese turno
 * 2. Habilidad estática permanente — no permite atacar el turno de entrada
 */
function hasUntapKillerOnEntry(desc: { en: string; ja: string }): boolean {
  // Mach Fighter ya cubre este caso, lo excluimos para no duplicar
  if (hasMachFighter(desc)) return false;

  // CIP pattern: "when you put this creature into the battle zone, this turn, this creature can attack untapped"
  const cipUntapPatterns = [
    /when you put this creature into the battle zone[^.]*this turn[^.]*attack untapped/i,
    /when this creature enters[^.]*this turn[^.]*attack untapped/i,
    /put into the battle zone[^.]*this turn[^.]*can attack untapped/i,
  ];

  if (cipUntapPatterns.some(p => p.test(desc.en))) return true;

  // Japanese CIP pattern
  if (desc.ja.includes('このターン') && desc.ja.includes('アンタップ') && desc.ja.includes('攻撃できる')) return true;

  return false;
}

/**
 * ¿Es una criatura Evolution?
 * Las criaturas Evolution (incluye NEO, G-NEO, etc.) no tienen summoning sickness.
 * Esto es equivalente a tener Speed Attacker.
 */
function isEvolutionCreature(card: GameCard): boolean {
  const typeEn = (card.typeEn || card.typeJa || '').toLowerCase();
  const typeJa = card.typeJa || '';

  return (
    typeEn.includes('evolution') ||
    typeEn.includes('neo evolution') ||
    typeEn.includes('g-neo evolution') ||
    typeJa.includes('進化') ||
    typeJa.includes('ネオ') ||
    typeJa.includes('G・ネオ')
  );
}

// ─── Función principal de análisis ──────────────────────────────────────────

/**
 * Analiza una carta y devuelve información sobre su summoning sickness
 * y capacidad de ataque en el turno de ingreso.
 *
 * @param card - La GameCard a analizar
 * @returns SummoningSicknessInfo con todos los detalles
 */
export function analyzeSummoningSickness(card: GameCard): SummoningSicknessInfo {
  const desc = getAllDescriptions(card);
  const detectedKeywords: string[] = [];

  const isEvolution = isEvolutionCreature(card);
  const speedAttacker = hasSpeedAttacker(desc);
  const machFighter = hasMachFighter(desc);
  const furyCharge = hasFuryCharge(desc);
  const untapKillerEntry = hasUntapKillerOnEntry(desc);

  if (speedAttacker) detectedKeywords.push('Speed Attacker');
  if (machFighter) detectedKeywords.push('Mach Fighter');
  if (furyCharge) detectedKeywords.push('Fury Charge');
  if (untapKillerEntry) detectedKeywords.push('Untap Killer (CIP)');
  if (isEvolution && !speedAttacker) detectedKeywords.push('Evolution (no sickness)');

  // ─── Determinar capacidad de ataque en el turno de ingreso ───

  // Prioridad: Mach Fighter > Speed Attacker = Evolution > Fury Charge > Untap Killer CIP > none
  // (Si tiene varios, el que otorga más privilegios "gana" en la clasificación,
  //  aunque en la práctica el simulador puede combinarlos si lo desea)

  let attackOnEntry: AttackCapabilityOnEntry = 'none';

  if (machFighter) {
    // Mach Fighter: puede atacar tapped Y untapped creatures (pero no al jugador)
    attackOnEntry = 'creatures';
  } else if (speedAttacker || isEvolution) {
    // Speed Attacker o Evolution: puede atacar al jugador y criaturas tapeadas
    attackOnEntry = 'full';
  } else if (furyCharge) {
    // Fury Charge: solo criaturas tapeadas
    attackOnEntry = 'tapped_only';
  } else if (untapKillerEntry) {
    // Untap Killer CIP: solo criaturas no tapeadas
    attackOnEntry = 'untapped_only';
  }

  const hasSickness = attackOnEntry === 'none';

  return {
    hasSickness,
    attackOnEntry,
    detectedKeywords,
    isEvolution,
  };
}

// ─── Helpers de conveniencia ─────────────────────────────────────────────────

/**
 * ¿Puede esta criatura atacar al jugador en el turno que ingresa?
 */
export function canAttackPlayerOnEntry(card: GameCard): boolean {
  const { attackOnEntry } = analyzeSummoningSickness(card);
  return attackOnEntry === 'full';
}

/**
 * ¿Puede esta criatura atacar criaturas tapeadas en el turno que ingresa?
 */
export function canAttackTappedOnEntry(card: GameCard): boolean {
  const { attackOnEntry } = analyzeSummoningSickness(card);
  return attackOnEntry === 'full' || attackOnEntry === 'tapped_only' || attackOnEntry === 'creatures';
}

/**
 * ¿Puede esta criatura atacar criaturas no tapeadas en el turno que ingresa?
 */
export function canAttackUntappedOnEntry(card: GameCard): boolean {
  const { attackOnEntry } = analyzeSummoningSickness(card);
  return attackOnEntry === 'creatures' || attackOnEntry === 'untapped_only';
}

/**
 * ¿Puede esta criatura atacar ALGO en el turno que ingresa?
 * (True si cualquier tipo de ataque está permitido)
 */
export function canAttackOnEntry(card: GameCard): boolean {
  const { hasSickness } = analyzeSummoningSickness(card);
  return !hasSickness;
}

/**
 * Devuelve un texto corto (en inglés) describiendo la capacidad de ataque al entrar.
 * Útil para tooltips en la UI.
 */
export function getAttackEntryLabel(card: GameCard): string {
  const { attackOnEntry, detectedKeywords } = analyzeSummoningSickness(card);
  const kw = detectedKeywords.join(', ');

  switch (attackOnEntry) {
    case 'full':
      return `Can attack on entry (${kw || 'Speed Attacker'})`;
    case 'creatures':
      return `Can attack any creature on entry (${kw || 'Mach Fighter'})`;
    case 'tapped_only':
      return `Can attack tapped creatures on entry (${kw || 'Fury Charge'})`;
    case 'untapped_only':
      return `Can attack untapped creatures on entry (${kw || 'Untap Killer'})`;
    case 'none':
    default:
      return 'Summoning sickness — cannot attack this turn';
  }
}
