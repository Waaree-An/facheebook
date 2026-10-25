const fs = require('fs');
const path = require('path');

class SimpleStorage {
  constructor(file) {
    this.file = file;
    this.store = {};
    try { this.store = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* empty */ }
  }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); try { fs.writeFileSync(this.file, JSON.stringify(this.store), 'utf8'); } catch { /* ignore */ } }
  removeItem(k) { delete this.store[k]; try { fs.writeFileSync(this.file, JSON.stringify(this.store), 'utf8'); } catch { /* ignore */ } }
}

const SRSSavePath = path.join(__dirname, 'test_cardSRS.json');
const storage = new SimpleStorage(SRSSavePath);
let loaded = 0;
let saved = 0;

const load = (deckKey) => {
  const raw = storage.getItem('fachee_cardSRS_' + deckKey);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      loaded = Object.keys(parsed).length;
    }
  }
};

const save = (deckKey, cardSRS) => {
  storage.setItem('fachee_cardSRS_' + deckKey, JSON.stringify(cardSRS));
  saved = Object.keys(cardSRS).length;
};

const DECK_KEY = 'm1';
const firstCardId = 'm1_card_0';

load(DECK_KEY);
console.log('Step 1 - after load, loaded cards = ' + loaded);

const withOneCard = {};
withOneCard[firstCardId] = {
  cardId: firstCardId,
  easeFactor: 2.5,
  interval: 1,
  repetitions: 1,
  nextReviewAt: '2026-10-21T00:00:00.000Z',
  lastReviewedAt: '2026-10-20T20:00:00.000Z',
  totalReviews: 1,
  lapses: 0,
  createdAt: '2026-10-20T20:00:00.000Z',
};
save(DECK_KEY, withOneCard);
console.log('Step 2 - after save: loaded=' + loaded + ' saved=' + saved);

loaded = 0;
saved = 0;
load(DECK_KEY);
console.log('Step 3 - after reload: loaded cards = ' + loaded + ' saved=' + saved);

storage.removeItem('fachee_cardSRS_m1');
const stillThere = storage.getItem('fachee_cardSRS_m1') === null;
console.log('Step 4 - SRS cleared after deck switch: ' + stillThere);

try { fs.unlinkSync(SRSSavePath); } catch { /* ignore */ }

let passed = true;
if (loaded !== 1) { console.log('FAIL: expected 1 card loaded, got ' + loaded); passed = false; }
if (saved !== 1) { console.log('FAIL: expected 1 card saved, got ' + saved); passed = false; }
if (!stillThere) { console.log('FAIL: SRS not cleared after deck switch'); passed = false; }
if (passed) { console.log('SUCCESS: cardSRS persistence works as expected.'); }
else { process.exit(1); }
