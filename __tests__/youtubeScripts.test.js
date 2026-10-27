// The WebView needs native code; only the scripts are tested here.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

import { EARLY_SCRIPT, PAGE_SCRIPT } from '../components/YouTubeView';

// A tiny stand-in for the YouTube page: just enough DOM for the scripts.
const fakePage = ({ withHead = true } = {}) => {
  const added = [];
  const node = () => ({ appendChild: (el) => added.push(el) });
  const document = {
    head: withHead ? node() : null,
    documentElement: node(),
    getElementById: (id) => added.find((el) => el.id === id) ?? null,
    createElement: () => ({}),
    addEventListener: () => {},
    querySelector: () => null,
  };
  return { document, added };
};

const run = (script, document) =>
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'setInterval', 'clearInterval', script)(
    document,
    { addEventListener: () => {}, ReactNativeWebView: { postMessage: () => {} } },
    () => 0,
    () => {}
  );

describe('scripts injected into the YouTube page', () => {
  it('are valid JavaScript', () => {
    expect(() => new Function(EARLY_SCRIPT)).not.toThrow(); // eslint-disable-line no-new-func
    expect(() => new Function(PAGE_SCRIPT)).not.toThrow(); // eslint-disable-line no-new-func
  });

  it('hide YouTube’s controls before the page has content', () => {
    const { document, added } = fakePage({ withHead: false });
    run(EARLY_SCRIPT, document);
    expect(added).toHaveLength(1);
    expect(added[0].id).toBe('animist-css');
    expect(added[0].textContent).toContain('#player-controls');
    expect(added[0].textContent).toContain('display:none!important');
  });

  it('add the rules only once, even when both scripts run', () => {
    const { document, added } = fakePage();
    run(EARLY_SCRIPT, document);
    run(PAGE_SCRIPT, document);
    expect(added.filter((el) => el.id === 'animist-css')).toHaveLength(1);
  });
});
