const english = require('../../public/locales/en/translation.json');
const spanish = require('../../public/locales/es/translation.json');

function messageCopy(locale) {
  return locale.dashboard.profiles.detail.messages;
}

function leafKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === 'object' ? leafKeys(child, path) : [path];
  });
}

describe('Conversation message recording locale contract', () => {
  test('Spanish and English expose the same translation keys', () => {
    expect(leafKeys(messageCopy(spanish)).sort()).toEqual(leafKeys(messageCopy(english)).sort());
  });

  test.each([
    ['English', english],
    ['Spanish', spanish],
  ])('%s contains every recording workflow state and action', (_language, locale) => {
    const copy = messageCopy(locale);

    for (const action of [
      'cancelRecording',
      'discardRecording',
      'recordAudio',
      'saveRecording',
      'savingRecording',
      'stopRecording',
    ]) {
      expect(copy.actions[action]).toBeTruthy();
    }

    for (const state of [
      'countdownDescription',
      'liveTitle',
      'preparingDescription',
      'preparingTitle',
      'previewDescription',
      'previewTitle',
    ]) {
      expect(copy.recording[state]).toBeTruthy();
    }

    expect(copy.recording.previewDescription.toLowerCase()).toMatch(/audio|grabaci|recording/);
  });
});
