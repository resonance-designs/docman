import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCalendarDate, formatDateTime } from './format.js';

test('calendar review dates retain their UTC calendar day across timezones', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['America/Denver', 'America/New_York', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      assert.equal(formatCalendarDate('2026-11-18T00:00:00.000Z'),
        new Intl.DateTimeFormat(undefined, {year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date('2026-11-18')));
    }
    process.env.TZ = 'America/Denver';
    assert.equal(formatDateTime('2026-11-18T00:00:00Z'), new Intl.DateTimeFormat(undefined, {
      year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',
    }).format(new Date('2026-11-18T00:00:00Z')));
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('missing and invalid calendar dates have a stable fallback', () => {
  assert.equal(formatCalendarDate(null), 'Not set');
  assert.equal(formatCalendarDate('invalid'), 'Not set');
});
