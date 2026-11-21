import { describe, expect, it } from 'vitest';
import { matchesTyped, narrowAnswer, normalizeQuery, parseSuggestions, startsWithNumber } from './geoapify';

const result = (overrides: object = {}) => ({
  housenumber: '2104', street: 'Oak Hollow Drive', city: 'New Delhi', state_code: 'DL', postcode: '110001',
  lat: 30.245, lon: -97.771, ...overrides,
});

describe('parseSuggestions', () => {
  it('turns a complete Indian address into the form fields and its coordinates', () => {
    expect(parseSuggestions({ results: [result()] })).toEqual([
      { street: '2104 Oak Hollow Drive', city: 'New Delhi', state: 'DL', zip: '110001', latitude: 30.245, longitude: -97.771 },
    ]);
  });

  it.each([
    ['without a house number', { housenumber: undefined }],
    ['without a street', { street: undefined }],
    ['without a city', { city: undefined }],
    ['without a PIN code', { postcode: undefined }],
    ['outside supported states', { state_code: 'PR' }],
    ['without coordinates', { lat: undefined }],
  ])('leaves out an address %s', (_, overrides) => {
    expect(parseSuggestions({ results: [result(overrides)] })).toEqual([]);
  });

  it('keeps the PIN and capitalises the state', () => {
    const [address] = parseSuggestions({ results: [result({ postcode: '110001', state_code: 'dl' })] });
    expect(address.zip).toBe('110001');
    expect(address.state).toBe('DL');
  });

  it('drops duplicates and keeps at most five', () => {
    const results = [result(), result(), ...[1, 2, 3, 4, 5, 6].map(n => result({ housenumber: String(n) }))];
    const out = parseSuggestions({ results });
    expect(out).toHaveLength(5);
    expect(out.map(a => a.street)).toEqual(['2104 Oak Hollow Drive', '1 Oak Hollow Drive', '2 Oak Hollow Drive', '3 Oak Hollow Drive', '4 Oak Hollow Drive']);
  });

  it('returns nothing for an answer without results', () => {
    expect(parseSuggestions({})).toEqual([]);
    expect(parseSuggestions(null)).toEqual([]);
  });
});

describe('the street field helpers', () => {
  const address = { street: '100 Congress Ave', city: 'New Delhi', state: 'DL', zip: '110001', latitude: 28.6139, longitude: 77.2090 };

  it.each([['100 co', true], [' 2104 Oak', true], ['new york', false], ['Congress Ave', false], ['', false]])(
    'looks up %j: %s', (text, expected) => {
      expect(startsWithNumber(text)).toBe(expected);
    });

  it('keys the cache by the text in lower case, with single spaces', () => {
    expect(normalizeQuery('  100   Congress AVE ')).toBe('100 congress ave');
  });

  it.each(['100', '100 cong', '100 Congress Ave', '100 congress av. new', '100 congress dl 110'])(
    'keeps an address shown while %j is typed', text => {
      expect(matchesTyped(address, text)).toBe(true);
    });

  it.each(['1000 cong', '100 congress st', '100 congress houston'])('drops it once %j is typed', text => {
    expect(matchesTyped(address, text)).toBe(false);
  });
});

describe('narrowAnswer', () => {
  const at = (street: string, city: string, state: string, zip: string) => ({ street, city, state, zip, latitude: 0, longitude: 0 });
  const answer = [at('350 5th Avenue', 'New York', 'NY', '10001'), at('350 5th Avenue', 'Pittsburgh', 'PA', '15222'), at('350 5th Street', 'Miami Beach', 'FL', '33139')];

  it("trusts the service on the words it was asked about (it knows \"fifth\" is \"5th\")", () => {
    expect(narrowAnswer(answer, '350 fifth', '350 fifth avenue new york').map(a => a.city)).toEqual(['New York']);
  });

  it('lets a word still being finished through', () => {
    expect(narrowAnswer(answer, '350 fif', '350 fifth av')).toHaveLength(2);
  });

  it('checks every word once the text no longer extends the one answered', () => {
    expect(narrowAnswer(answer, '350 fifth', '35 fifth')).toEqual([]);
    expect(narrowAnswer(answer, '350 5th avenue', '350 5th st').map(a => a.city)).toEqual(['Miami Beach']);
  });
});
