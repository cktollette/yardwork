import { formatDuration, formatMowDate, formatTemp } from './format';

describe('formatDuration', () => {
  it('formats whole seconds as HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(2400)).toBe('00:40:00');
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('clamps negatives and floors fractions', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
    expect(formatDuration(90.9)).toBe('00:01:30');
  });
});

describe('formatMowDate', () => {
  it('formats an epoch as a short human date', () => {
    // Local-time construction so the assertion is timezone-independent.
    const epoch = new Date(2026, 6, 22, 9, 0).getTime(); // Jul 22, 2026
    expect(formatMowDate(epoch)).toBe('Jul 22, 2026');
  });
});

describe('formatTemp', () => {
  it('attaches the °F unit to a whole-degree reading', () => {
    expect(formatTemp(72)).toBe('72°F');
  });

  it('renders a legit 0°F reading (not dropped as falsy)', () => {
    expect(formatTemp(0)).toBe('0°F');
  });
});
