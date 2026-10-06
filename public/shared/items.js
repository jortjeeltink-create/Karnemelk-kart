// Power-ups. Codes zijn getallen zodat ze compact over het netwerk gaan.
export const ITEM = { NONE: 0, TURBO: 1, TURBO3: 2, SCHILD: 3, PLAS: 4, KLOMP: 5 };

export const ITEM_INFO = {
  [ITEM.TURBO]: { key: 'turbo', name: 'Stroopwafel-turbo', desc: 'Even keihard vooruit.' },
  [ITEM.TURBO3]: { key: 'turbo3', name: 'Drie stroopwafels', desc: 'Drie keer een snelheidsboost.' },
  [ITEM.SCHILD]: { key: 'schild', name: 'Kaasschild', desc: '8 seconden bescherming tegen botsingen en klappen.' },
  [ITEM.PLAS]: { key: 'plas', name: 'Karnemelkplas', desc: 'Gladde plas achter je. Wie erin rijdt, tolt rond.' },
  [ITEM.KLOMP]: { key: 'klomp', name: 'Klompkanon', desc: 'Schiet een klomp vooruit (of achteruit met de rem ingedrukt).' },
};

// Kans op items hangt af van je plek in de race: achteraan krijg je betere hulp.
export function rollItem(place, total, rand) {
  const r = total <= 1 ? 0.5 : (place - 1) / (total - 1);
  let table;
  if (r < 0.2) table = [[ITEM.PLAS, 38], [ITEM.SCHILD, 27], [ITEM.KLOMP, 25], [ITEM.TURBO, 10]];
  else if (r < 0.65) table = [[ITEM.TURBO, 26], [ITEM.KLOMP, 26], [ITEM.PLAS, 18], [ITEM.SCHILD, 18], [ITEM.TURBO3, 12]];
  else table = [[ITEM.TURBO3, 36], [ITEM.TURBO, 28], [ITEM.KLOMP, 20], [ITEM.SCHILD, 16]];
  const sum = table.reduce((a, [, w]) => a + w, 0);
  let x = rand() * sum;
  for (const [item, w] of table) {
    if ((x -= w) < 0) return item;
  }
  return table[0][0];
}

export const ITEM_ROLL_TIME = 1.2; // seconden "rad van fortuin"
export const BOX_RESPAWN = 3.0;
