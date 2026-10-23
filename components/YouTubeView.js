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
].join(',');

// Runs inside the YouTube page: hides its UI, starts playback and reports status every 400 ms.
const PAGE_SCRIPT = `
(function () {
  var style = document.createElement('style');
  style.textContent = '${HIDE_YOUTUBE_UI}{display:none!important;} html,body{background:#000!important;}';
  document.head.appendChild(style);

  function post(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  function video() { return document.querySelector('video'); }

  window.__animist = {
    play: function () {
      var v = video(); if (!v) return;
      v.play().catch(function () { v.muted = true; v.play().catch(function () {}); post({ type: 'muted' }); });
    },
    pause: function () { var v = video(); if (v) v.pause(); },
    seek: function (s) { var v = video(); if (v) v.currentTime = s; },
    mute: function (m) { var v = video(); if (v) v.muted = m; }
  };

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
    post({ type: 'status', current: v.currentTime || 0, duration: v.duration || 0,
           paused: v.paused, ended: v.ended, ready: v.readyState >= 2, muted: v.muted });
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

const embedUrl = (videoId) =>
  `https://www.youtube.com/embed/${videoId}?` +
  [
    'autoplay=1', 'controls=0', 'playsinline=1', 'rel=0', 'modestbranding=1', 'iv_load_policy=3',
    'fs=0', 'disablekb=1', 'cc_load_policy=0', `widget_referrer=${encodeURIComponent(APP_REFERER)}`,
  ].join('&');

// A bare YouTube player. Parent components get status through onStatus/onError and
// control it with ref.play(), pause(), seek(seconds) and mute(bool).
const YouTubeView = forwardRef(({ videoId, onStatus, onError, onMuted, style }, ref) => {
  const web = useRef(null);
  const run = (code) => web.current?.injectJavaScript(`window.__animist && window.__animist.${code}; true;`);

  useImperativeHandle(ref, () => ({
    play: () => run('play()'),
    pause: () => run('pause()'),
    seek: (seconds) => run(`seek(${Number(seconds) || 0})`),
    mute: (muted) => run(`mute(${muted ? 'true' : 'false'})`),
  }));

  const onMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'status') onStatus?.(message);
      else if (message.type === 'error') onError?.(message.text);
      else if (message.type === 'muted') onMuted?.();
    } catch {
      // Not one of our messages.
    }
  };

  return (
    <WebView
      ref={web}
      source={{ uri: embedUrl(videoId), headers: { Referer: APP_REFERER } }}
      style={[{ backgroundColor: '#000' }, style]}
      injectedJavaScript={PAGE_SCRIPT}
      onMessage={onMessage}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      javaScriptEnabled
      domStorageEnabled
      bounces={false}
      scrollEnabled={false}
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
