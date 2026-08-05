import {
  formatDateField,
  formatTimeField,
  parseDateTimeField,
} from './datetimeField';

describe('datetime text fields', () => {
  // A fixed local wall-clock moment we can format and re-parse.
  const epoch = new Date(2026, 6, 22, 9, 5).getTime(); // 2026-07-22 09:05 local

  it('formats an epoch into zero-padded date and time fields', () => {
    expect(formatDateField(epoch)).toBe('2026-07-22');
    expect(formatTimeField(epoch)).toBe('09:05');
  });

  it('round-trips format -> parse back to the same epoch', () => {
    const parsed = parseDateTimeField(formatDateField(epoch), formatTimeField(epoch));
    expect(parsed).toBe(epoch);
  });

  it('parses valid date and time strings to a local epoch', () => {
    expect(parseDateTimeField('2026-07-22', '09:05')).toBe(epoch);
  });

  it('returns null for malformed input', () => {
    expect(parseDateTimeField('2026/07/22', '09:05')).toBeNull();
    expect(parseDateTimeField('2026-07-22', '9:5')).toBeNull();
    expect(parseDateTimeField('not-a-date', '09:05')).toBeNull();
    expect(parseDateTimeField('2026-07-22', '')).toBeNull();
  });

  it('returns null for out-of-range calendar values (no silent rollover)', () => {
    expect(parseDateTimeField('2026-02-30', '09:05')).toBeNull(); // Feb 30 does not exist
    expect(parseDateTimeField('2026-13-01', '09:05')).toBeNull(); // month 13
    expect(parseDateTimeField('2026-07-22', '24:00')).toBeNull(); // hour 24
    expect(parseDateTimeField('2026-07-22', '09:60')).toBeNull(); // minute 60
  });
});
