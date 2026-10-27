// The WebView needs native code; only the scripts are tested here.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

import { EARLY_SCRIPT, PAGE_SCRIPT } from '../components/YouTubeView';

// A tiny stand-in for the YouTube page: just enough DOM for the scripts.
const fakePage = ({ withHead = true } = {}) => {
  const added = [];
  const vars = {};
  const node = () => ({ appendChild: (el) => added.push(el), style: { setProperty: (k, v) => (vars[k] = v) } });
  const document = {
    head: withHead ? node() : null,
    documentElement: node(),
    getElementById: (id) => added.find((el) => el.id === id) ?? null,
    createElement: () => ({}),
    addEventListener: () => {},
    querySelector: () => null,
  };
  return { document, added, vars };
};

const run = (script, document, window = {}) =>
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'setInterval', 'clearInterval', script)(
    document,
    // The same window object across runs, like one real page.
    Object.assign(window, { addEventListener: () => {}, ReactNativeWebView: { postMessage: () => {} } }),
    () => 0,
    () => {}
  );

// The part of the page that's visible, as WebView reports it; resize() changes it like a rotation.
const viewport = (width, height) => {
  const listeners = [];
  const vv = {
    width,
    height,
    addEventListener: (type, fn) => type === 'resize' && listeners.push(fn),
    resize: (w, h) => {
      vv.width = w;
      vv.height = h;
      listeners.forEach((fn) => fn());
    },
  };
  return vv;
};

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

// Visible sizes (CSS px) of fullscreen and inline players on different phones. On some, Android lays
// the page out bigger than this (a 2.75x phone gave 732x411 for a 698x392 player), and a player
// sized to the page loses the bottom and right of the picture.
const DEVICES = [
  ['2.75x phone, fullscreen', 698.18, 392],
  ['2.75x phone, inline', 392.73, 221.09],
  ['small 2x phone, fullscreen', 568, 320],
  ['tall phone with a cutout, fullscreen', 746.67, 420],
  ['tablet, fullscreen', 1280, 720],
];

describe('player size', () => {
  it.each(DEVICES)('fits the visible part of the page: %s', (_, width, height) => {
    const { document, added, vars } = fakePage();
    run(EARLY_SCRIPT, document, { visualViewport: viewport(width, height) });
    expect(vars).toEqual({ '--animist-w': `${width}px`, '--animist-h': `${height}px` });
    const css = added[0].textContent;
    expect(css).toContain('width:var(--animist-w,100%)!important');
    expect(css).toContain('height:var(--animist-h,100%)!important');
    // Any video shape (16:9, 4:3, cinema) shows whole inside the player.
    expect(css).toContain('object-fit:contain!important');
  });

  it('follows the visible size when it changes (rotation, window resize)', () => {
    const { document, vars } = fakePage();
    const vv = viewport(392.73, 221.09);
    run(EARLY_SCRIPT, document, { visualViewport: vv });
    vv.resize(698.18, 392);
    expect(vars['--animist-w']).toBe('698.18px');
    expect(vars['--animist-h']).toBe('392px');
  });

  it('keeps one resize listener when both scripts run', () => {
    const { document } = fakePage();
    const vv = viewport(698.18, 392);
    const add = jest.spyOn(vv, 'addEventListener');
    const window = { visualViewport: vv };
    run(EARLY_SCRIPT, document, window);
    run(PAGE_SCRIPT, document, window);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('falls back to the whole page on WebViews without visualViewport', () => {
    const { document, vars } = fakePage();
    run(EARLY_SCRIPT, document);
    expect(vars).toEqual({});
  });

  it('ignores a zero size reported before layout', () => {
    const { document, vars } = fakePage();
    run(EARLY_SCRIPT, document, { visualViewport: viewport(0, 0) });
    expect(vars).toEqual({});
  });
});
