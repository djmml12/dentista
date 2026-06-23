import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidInterval, intervalsOverlap } from './time.js';

const d = (iso: string) => new Date(iso);

describe('isValidInterval', () => {
  it('acepta fin posterior al inicio', () => {
    assert.equal(isValidInterval(d('2026-06-13T10:00:00Z'), d('2026-06-13T10:30:00Z')), true);
  });

  it('rechaza fin igual al inicio', () => {
    assert.equal(isValidInterval(d('2026-06-13T10:00:00Z'), d('2026-06-13T10:00:00Z')), false);
  });

  it('rechaza fin anterior al inicio', () => {
    assert.equal(isValidInterval(d('2026-06-13T10:30:00Z'), d('2026-06-13T10:00:00Z')), false);
  });
});

describe('intervalsOverlap', () => {
  const aStart = d('2026-06-13T10:00:00Z');
  const aEnd = d('2026-06-13T11:00:00Z');

  it('detecta solape parcial', () => {
    assert.equal(
      intervalsOverlap(aStart, aEnd, d('2026-06-13T10:30:00Z'), d('2026-06-13T11:30:00Z')),
      true,
    );
  });

  it('detecta contención total', () => {
    assert.equal(
      intervalsOverlap(aStart, aEnd, d('2026-06-13T10:15:00Z'), d('2026-06-13T10:45:00Z')),
      true,
    );
  });

  it('NO solapa cuando son contiguos (fin == inicio)', () => {
    assert.equal(
      intervalsOverlap(aStart, aEnd, d('2026-06-13T11:00:00Z'), d('2026-06-13T12:00:00Z')),
      false,
    );
  });

  it('NO solapa cuando están separados', () => {
    assert.equal(
      intervalsOverlap(aStart, aEnd, d('2026-06-13T12:00:00Z'), d('2026-06-13T13:00:00Z')),
      false,
    );
  });
});
