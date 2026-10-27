import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

// YouTube blocks embedded players that don't say which app they're in ("Error 153"),
// so every request carries this Referer. It should match the app's package name.
// https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity
export const APP_REFERER = 'https://com.fnyz.animist';

// Hides YouTube's own interface; the app draws its own controls on top.
const HIDE_YOUTUBE_UI = [
  '.ytp-chrome-top', '.ytp-chrome-bottom', '.ytp-gradient-top', '.ytp-gradient-bottom',
  '.ytp-watermark', '.ytp-youtube-button', '.ytp-large-play-button', '.ytp-pause-overlay',
  '.ytp-show-cards-title', '.ytp-ce-element', '.ytp-endscreen-content', '.ytp-paid-content-overlay',
  '.ytp-impression-link', '.ytp-cards-button', '.ytp-spinner', '.ytp-contextmenu',
  // YouTube's mobile layout puts its controls next to the player instead of inside it.
  '#player-controls', '#player-control-overlay', '[class*="PlayerControls"]', '[class*="ytmCustomControl"]',
].join(',');

// The page's look: no scrolling, ever (the page must always fit the player exactly); the video
// fills the player box and always shows the whole frame ("contain"); and everything in YouTube's
// player except the video itself (titles, buttons, logos, overlays) is hidden, whatever YouTube
// names it, desktop or mobile layout.
const PAGE_CSS =
  `${HIDE_YOUTUBE_UI}{display:none!important;}` +
  ' html,body{background:#000!important;overflow:hidden!important;height:100%!important;margin:0!important;overscroll-behavior:none!important;touch-action:none!important;}' +
  ' #player,#movie_player,.html5-video-player,.html5-video-container{position:fixed!important;left:0!important;top:0!important;width:var(--animist-w,100%)!important;height:var(--animist-h,100%)!important;}' +
  ' video.html5-main-video{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;object-fit:contain!important;}' +
  ' .html5-video-player > :not(.html5-video-container){display:none!important;}';

// Adds PAGE_CSS to the page once (both scripts below call it), and sizes the player to the part of
// the page that's actually visible. On some phones Android lays the page out larger than the
// WebView (about 5% on a 2.75x screen), so a player sized to the page lost the bottom and right of
// the picture, subtitles included.
const ADD_CSS = `
  function fitAnimist() {
    var vv = window.visualViewport, el = document.documentElement;
    if (!vv || !el || !vv.width || !vv.height) return;
    el.style.setProperty('--animist-w', vv.width + 'px');
    el.style.setProperty('--animist-h', vv.height + 'px');
  }
  if (window.visualViewport && !window.__animistFit) {
    window.__animistFit = true;
    window.visualViewport.addEventListener('resize', fitAnimist);
  }
  function addAnimistCss() {
    fitAnimist();
    if (document.getElementById('animist-css')) return true;
    var root = document.head || document.documentElement;
    if (!root) return false;
    var style = document.createElement('style');
    style.id = 'animist-css';
    style.textContent = ${JSON.stringify(PAGE_CSS)};
    root.appendChild(style);
    return true;
  }
`;

// Runs before YouTube's page has any content, so its own controls never show, not even for a
// moment on a slow connection (PAGE_SCRIPT only runs once the page has loaded).
export const EARLY_SCRIPT = `
(function () {
  ${ADD_CSS}
  if (!addAnimistCss()) {
    var timer = setInterval(function () { if (addAnimistCss()) clearInterval(timer); }, 10);
  }
  document.addEventListener('DOMContentLoaded', addAnimistCss);
})();
true;
`;

// Runs inside the YouTube page once it has loaded: hides its UI (again, in case the early script
// couldn't run), starts playback and reports status every 400 ms.
export const PAGE_SCRIPT = `
(function () {
  ${ADD_CSS}
  addAnimistCss();

  function post(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  function video() { return document.querySelector('video'); }

  // Taps that reach YouTube's page go to the app instead, so YouTube never pauses or shows
  // its own UI on its own; the app decides what a tap does.
  ['click', 'dblclick'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'click') post({ type: 'tap' });
    }, true);
  });

  window.__animist = {
    play: function () {
      var v = video(); if (!v) return;
      v.play().catch(function () { v.muted = true; v.play().catch(function () {}); post({ type: 'muted' }); });
    },
    pause: function () { var v = video(); if (v) v.pause(); },
    seek: function (s) { var v = video(); if (v) v.currentTime = s; },
    mute: function (m) { var v = video(); if (v) v.muted = m; },
    // YouTube's own player object on the embed page picks the stream quality.
    quality: function (q) {
      var p = document.getElementById('movie_player');
      if (p && p.setPlaybackQualityRange) p.setPlaybackQualityRange(q, q);
    }
  };
  function qualityInfo() {
    var p = document.getElementById('movie_player');
    return {
      qualities: p && p.getAvailableQualityLevels ? p.getAvailableQualityLevels() : [],
      quality: p && p.getPlaybackQuality ? p.getPlaybackQuality() : null
    };
  }

  var lastError = '';
  setInterval(function () {
    var error = document.querySelector('.ytp-error');
    if (error && error.offsetParent !== null) {
      var text = (error.innerText || '').replace(/\\s+/g, ' ').trim();
      if (text !== lastError) { lastError = text; post({ type: 'error', text: text }); }
      return;
    }
    var v = video();
    if (!v) return;
    var q = qualityInfo();
    post({ type: 'status', current: v.currentTime || 0, duration: v.duration || 0,
           paused: v.paused, ended: v.ended, ready: true, muted: v.muted,
           qualities: q.qualities, quality: q.quality });
  }, 400);

  // Autoplay: keep trying for a few seconds while the player loads.
  var tries = 0;
  var starter = setInterval(function () {
    var v = video();
    if (v && !v.paused) { clearInterval(starter); return; }
    if (v) window.__animist.play();
    if (++tries > 12) clearInterval(starter);
  }, 500);
})();
true;
`;

const embedUrl = (videoId, start = 0, muted = false) =>
  `https://www.youtube.com/embed/${videoId}?` +
  [
    `start=${Math.max(0, Math.floor(start))}`,
    ...(muted ? ['mute=1'] : []),
    'autoplay=1', 'controls=0', 'playsinline=1', 'rel=0', 'modestbranding=1', 'iv_load_policy=3',
    'fs=0', 'disablekb=1', 'cc_load_policy=0', `widget_referrer=${encodeURIComponent(APP_REFERER)}`,
  ].join('&');

// A bare YouTube player. Parent components get status through onStatus/onError and
// control it with ref.play(), pause(), seek(seconds) and mute(bool).
// `start` (seconds) and `muted` only apply when the view is created; give it a new `key` to restart elsewhere.
const YouTubeView = forwardRef(({ videoId, start = 0, muted = false, onStatus, onError, onMuted, onTap, style }, ref) => {
  const web = useRef(null);
  const run = (code) => web.current?.injectJavaScript(`window.__animist && window.__animist.${code}; true;`);

  useImperativeHandle(ref, () => ({
    play: () => run('play()'),
    pause: () => run('pause()'),
    seek: (seconds) => run(`seek(${Number(seconds) || 0})`),
    mute: (muted) => run(`mute(${muted ? 'true' : 'false'})`),
    quality: (level) => run(`quality(${JSON.stringify(String(level))})`),
  }));

  const onMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'status') onStatus?.(message);
      else if (message.type === 'error') onError?.(message.text);
      else if (message.type === 'muted') onMuted?.();
      else if (message.type === 'tap') onTap?.();
    } catch {
      // Not one of our messages.
    }
  };

  return (
    <WebView
      ref={web}
      source={{ uri: embedUrl(videoId, start, muted), headers: { Referer: APP_REFERER } }}
      style={[{ backgroundColor: '#000' }, style]}
      injectedJavaScriptBeforeContentLoaded={EARLY_SCRIPT}
      injectedJavaScript={PAGE_SCRIPT}
      onMessage={onMessage}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      javaScriptEnabled
      domStorageEnabled
      // Lets Chrome's DevTools (chrome://inspect) look inside the player while developing.
      webviewDebuggingEnabled={__DEV__}
      bounces={false}
      scrollEnabled={false}
      // Lay YouTube's page out at the player's real size. Scale-to-fit (the default) lays it out at
      // another size and squeezes it in, which stretches the video and makes it overflow.
      scalesPageToFit={false}
      setBuiltInZoomControls={false}
      setDisplayZoomControls={false}
      overScrollMode="never"
      nestedScrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      // Stay on the embed page: never open youtube.com links inside the player.
      onShouldStartLoadWithRequest={(req) =>
        req.isTopFrame === false || req.url.startsWith('https://www.youtube.com/embed/') || req.url === 'about:blank'
      }
      onError={(e) => onError?.(e.nativeEvent.description)}
    />
  );
});

YouTubeView.displayName = 'YouTubeView';

export default YouTubeView;
