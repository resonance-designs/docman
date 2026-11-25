import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceVariables, safeAppearance, appearanceError, cloneAppearance, defaultAppearance, isSafeLogo, isHttpsUrl } from './lib/appearance.js';

test('malformed saved appearance cannot inject CSS, images, or active footer URLs', () => {
  const value = safeAppearance({
    typography: { h1: { color: 'red; background:url(https://evil.test)', fontSize: '20px' } },
    logo: { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', alt: '<script>literal</script>' },
    menuPosition: 'url(javascript:alert(1))', footer: { linkUrl: 'javascript:alert(1)', textColor: 'expression(alert(1))' },
  });
  assert.equal(value.logo.dataUrl, '');
  assert.equal(value.footer.linkUrl, '');
  assert.equal(value.menuPosition, 'left');
  assert.equal(value.typography.h1.color, defaultAppearance.typography.h1.color);
  const variables = appearanceVariables(value);
  assert.equal(variables['--appearance-h1-size'], '34px');
  assert.equal(Object.keys(variables).length, 22);
});

test('preview variables are isolated and do not mutate the saved configuration', () => {
  const saved = cloneAppearance(defaultAppearance);
  const draft = cloneAppearance(saved);
  draft.typography.h1.color = '#123456'; draft.typography.h1.fontSize = 48;
  const variables = appearanceVariables(draft);
  assert.equal(variables['--appearance-h1-color'], '#123456');
  assert.equal(variables['--appearance-h1-size'], '48px');
  assert.equal(saved.typography.h1.fontSize, 34);
  assert.equal(defaultAppearance.typography.h1.fontSize, 34);
});

test('validation rejects unsafe links and image formats, invalid sizes and partial footer links', () => {
  for (const url of ['javascript:alert(1)', 'http://example.org', 'https:example.org', '//example.org', 'https://name:password@example.org', 'https://example.org\\evil', 'https://example.org\n']) assert.equal(isHttpsUrl(url), false, url);
  assert.equal(isHttpsUrl('https://example.org/privacy?lang=en'), true);
  assert.equal(isSafeLogo('https://example.org/logo.png'), false);
  assert.equal(isSafeLogo('data:image/svg+xml;base64,AAAA'), false);
  assert.equal(isSafeLogo('data:image/png;base64,' + 'A'.repeat(350001)), false);
  for (const size of [9, 73, 12.5, '16']) {
    const value = cloneAppearance(defaultAppearance); value.typography.paragraph.fontSize = size;
    assert.match(appearanceError(value), /whole-number/);
  }
  const value = cloneAppearance(defaultAppearance); value.footer.linkUrl = 'https://example.org';
  assert.match(appearanceError(value), /both/);
  value.footer.linkLabel = 'Privacy';
  assert.equal(appearanceError(value), '');
  value.footer.text = 'two\nlines'; assert.match(appearanceError(value), /line breaks/);
});

test('missing and partial values fall back safely without losing valid preferences', () => {
  assert.deepEqual(safeAppearance(null), defaultAppearance);
  const value = safeAppearance({ menuPosition: 'right', footer: { enabled: true, text: 'Example organization' } });
  assert.equal(value.menuPosition, 'right'); assert.equal(value.footer.enabled, true);
  assert.equal(value.typography.paragraph.fontSize, 16);
});
