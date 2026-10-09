// Gedeelde instellingen voor server én browser.
export const GAME_NAME = 'Karnemelk Kart';

export const TICK_RATE = 60;            // fysica-stappen per seconde
export const DT = 1 / TICK_RATE;
export const SNAPSHOT_RATE = 30;        // statusupdates per seconde naar de spelers
export const MAX_PLAYERS = 10;          // spelers + bots per room
export const LAPS = 3;
export const COUNTDOWN_MS = 3000;       // 3-2-1
export const START_DELAY_MS = 5200;     // tijd tussen "start" en GO (laden + intro + aftellen)
export const FINISH_GRACE = 30;         // seconden die anderen krijgen nadat de winnaar finisht
export const MAX_RACE_TIME = 420;       // noodstop na 7 minuten
export const RECONNECT_GRACE_MS = 120000; // zo lang blijft je plek bewaard bij verbindingsverlies
export const ROOM_IDLE_MS = 180000;     // lege rooms worden na 3 minuten opgeruimd
export const KART_RADIUS = 1.25;

export const PHYS = {
  maxSpeed: 27,        // m/s (~97 km/u)
  accel: 17,
  brake: 34,
  reverseAccel: 10,
  maxReverse: 9,
  coast: 4,
  turnRate: 2.15,      // rad/s
  grip: 9,
  driftGrip: 2.3,
  iceGrip: 1.4,
  offroadFactor: 0.52,
  mudFactor: 0.58,
  waterFactor: 0.45,
  boostFactor: 1.38,
  boostAccel: 32,
  bumpFactor: 0.58,
  wallBounce: 0.35,
};

// Schansen: rijd eroverheen en je vliegt (over andere karts heen)
// Geheime boostknop (alleen voor wie de geheime code heeft ingevuld)
export const SECRET_BOOST = {
  time: 1.5,      // seconden turbo per tik
  cooldown: 4,    // seconden wachten tot de volgende
};

export const JUMP = {
  gravity: 30,        // m/s² omlaag
  rampH: 1.1,         // hoogte van de schansrand
  launch: 11,         // m/s omhoog bij volle snelheid (keer de kracht van de schans)
  minSpeed: 8,        // langzamer dan dit: je rolt er gewoon af
  airSteer: 0.35,     // in de lucht stuur je maar een beetje
  minAir: 0.4,        // zo lang vliegen voor een landingsturbo
  landBoost: 0.6,     // seconden turbo na een mooie landing
  ringBoost: 1.5,     // seconden turbo door een boostring
  clear: 1.3,         // zoveel hoogteverschil en karts raken elkaar niet
};

export const DRIFT_LEVELS = [0.9, 1.8, 2.9];       // seconden laden per niveau
export const DRIFT_BOOST = [0, 0.7, 1.15, 1.7];     // boostduur per niveau

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;
