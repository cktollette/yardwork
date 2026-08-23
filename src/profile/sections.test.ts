import {
  formatRelativeDate,
  garageSubtitle,
  mowsSubtitle,
  myLawnSubtitle,
  statisticsSubtitle,
} from './sections';

const ASCII = /^[\x00-\x7F]*$/;
const NOW = Date.parse('2026-07-22T12:00:00Z');
const day = 86_400_000;

describe('formatRelativeDate', () => {
  it('renders coarse buckets', () => {
    expect(formatRelativeDate(NOW, NOW)).toBe('today');
    expect(formatRelativeDate(NOW - day, NOW)).toBe('yesterday');
    expect(formatRelativeDate(NOW - 3 * day, NOW)).toBe('3 days ago');
    expect(formatRelativeDate(NOW - 8 * day, NOW)).toBe('1 week ago');
    expect(formatRelativeDate(NOW - 21 * day, NOW)).toBe('3 weeks ago');
    expect(formatRelativeDate(NOW - 60 * day, NOW)).toBe('2 months ago');
  });
});

describe('section subtitles (ASCII, " - " separators, empty states)', () => {
  it('statistics: count + hours, or empty state', () => {
    expect(statisticsSubtitle({ lifetimeMows: 12, lifetimeHours: 5.42 })).toBe('12 mows - 5.4h');
    expect(statisticsSubtitle({ lifetimeMows: 0, lifetimeHours: 0 })).toBe('No mows yet');
  });

  it('mows: last-mow relative date, or empty state', () => {
    expect(mowsSubtitle(NOW - 2 * day, NOW)).toBe('Last mow: 2 days ago');
    expect(mowsSubtitle(null, NOW)).toBe('No mows yet');
  });

  it('my lawn: zones + area, singular/plural, or empty state', () => {
    expect(myLawnSubtitle(2, 5234)).toBe('2 zones - 5,234 sq ft');
    expect(myLawnSubtitle(1, 1000)).toBe('1 zone - 1,000 sq ft');
    expect(myLawnSubtitle(0, 0)).toBe('No lawn drawn yet');
  });

  it('garage: piece count, singular/plural, or empty state', () => {
    expect(garageSubtitle(3)).toBe('3 pieces');
    expect(garageSubtitle(1)).toBe('1 piece');
    expect(garageSubtitle(0)).toBe('Garage is empty');
  });

  it('all subtitles are ASCII-only', () => {
    const samples = [
      statisticsSubtitle({ lifetimeMows: 12, lifetimeHours: 5.4 }),
      statisticsSubtitle({ lifetimeMows: 0, lifetimeHours: 0 }),
      mowsSubtitle(NOW - 2 * day, NOW),
      mowsSubtitle(null, NOW),
      myLawnSubtitle(2, 5234),
      myLawnSubtitle(0, 0),
      garageSubtitle(3),
      garageSubtitle(0),
    ];
    for (const s of samples) expect(ASCII.test(s)).toBe(true);
  });
});
