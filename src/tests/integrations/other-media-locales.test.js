const english = require('../../public/locales/en/translation.json');
const spanish = require('../../public/locales/es/translation.json');

function otherCopy(locale) {
  return locale.dashboard.profiles.detail.integrations.other;
}

function integrationCopy(locale) {
  return locale.dashboard.profiles.detail.integrations;
}

function leafKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === 'object' ? leafKeys(child, path) : [path];
  });
}

describe('Integration locale contract', () => {
  test('Spanish and English expose the same translation keys', () => {
    expect(leafKeys(integrationCopy(spanish)).sort()).toEqual(leafKeys(integrationCopy(english)).sort());
  });

  test.each([
    ['English', english],
    ['Spanish', spanish],
  ])('%s copy contains the dynamic action and selection placeholders', (_language, locale) => {
    const copy = otherCopy(locale);

    expect(copy.actionPreview).toContain('{{action}}');
    expect(copy.hint).toContain('{{limit}}');
    expect(copy.fields.customDestination).toBeTruthy();
    expect(copy.validation.customRequired).toBeTruthy();
    expect(copy.validation.linkInvalid).toBeTruthy();
  });

  test.each([
    ['English', english],
    ['Spanish', spanish],
  ])('%s copy explains each destructive disconnect flow', (_language, locale) => {
    const confirmation = integrationCopy(locale).disconnectConfirmation;

    expect(confirmation.cancel).toBeTruthy();
    expect(confirmation.confirm).toBeTruthy();

    for (const provider of ['instagram', 'tiktok', 'youtube']) {
      expect(confirmation[provider].title).toBeTruthy();
      expect(confirmation[provider].body.length).toBeGreaterThan(120);
    }
  });
});
