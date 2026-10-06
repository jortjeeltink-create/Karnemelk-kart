// Voorspelling van je eigen kart: we rijden lokaal direct door (geen vertraging)
// en corrigeren zodra de server zegt waar je volgens hem echt bent.
import { stepKart, createKart } from '../../shared/physics.js';
import { decodeFull, encodeInput, decodeInput } from '../../shared/protocol.js';
import { autopilotInput } from '../../shared/bots.js';

export class Predictor {
  constructor(track, kid, slot, laps) {
    this.track = track;
    this.kid = kid;
    this.laps = laps;
    this.kart = createKart(kid, track, slot);
    this.pending = [];
    this.seq = 0;
    this.lastAck = 0;
    this.corrections = 0;
    this.lastError = 0;
  }

  env(time, emit) {
    return { time, laps: this.laps, emit, autopilot: (k) => autopilotInput(k, this.track) };
  }

  // Eén stap vooruit met de knoppen van nu. Geeft de (afgeronde) invoer terug om te versturen.
  step(rawInput, time, emit) {
    const packed = encodeInput(rawInput);
    const inp = decodeInput(packed); // precies wat de server ook krijgt
    this.seq += 1;
    this.pending.push({ seq: this.seq, inp, time });
    if (this.pending.length > 600) this.pending.shift();
    stepKart(this.kart, inp, this.track, this.env(time, emit));
    return { seq: this.seq, packed };
  }

  // Serverstatus verwerken en de nog niet bevestigde stappen opnieuw afspelen.
  reconcile(full) {
    const before = { x: this.kart.x, z: this.kart.z, h: this.kart.h };
    const srv = decodeFull(full, {});
    const ack = srv.ack;
    if (ack < this.lastAck) return null; // oud bericht
    this.lastAck = ack;
    const k = this.kart;
    Object.assign(k, srv);
    const loc = this.track.locate(k.x, k.z, k.i);
    k.i = loc.i; k.s = loc.s; k.d = loc.d;
    this.pending = this.pending.filter((p) => p.seq > ack);
    for (const p of this.pending) stepKart(k, p.inp, this.track, this.env(p.time, null));
    const err = Math.hypot(k.x - before.x, k.z - before.z);
    this.lastError = err;
    if (err > 0.05) this.corrections++;
    return { dx: before.x - k.x, dz: before.z - k.z, dh: before.h - k.h, err };
  }
}
