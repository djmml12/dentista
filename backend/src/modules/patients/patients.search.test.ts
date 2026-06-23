import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeLike } from './patients.service.js';

describe('escapeLike', () => {
  it('deja texto normal intacto', () => {
    assert.equal(escapeLike('jose'), 'jose');
  });

  it('escapa el comodín de porcentaje', () => {
    assert.equal(escapeLike('100%'), '100\\%');
  });

  it('escapa el comodín de guion bajo', () => {
    assert.equal(escapeLike('a_b'), 'a\\_b');
  });

  it('escapa la barra invertida', () => {
    assert.equal(escapeLike('a\\b'), 'a\\\\b');
  });
});
