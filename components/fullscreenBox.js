// Where the fullscreen video goes, as a pure function so it can be tested for many devices.
//
// screen: the physical screen in dp ({ width, height }, either orientation)
// root:   the space the fullscreen view actually got ({ width, height }), measured on screen
// insets: safe-area insets ({ left, right }); in landscape the camera cutout shows up here
//
// Returns the largest 16:9 box that fits in that space and clear of the cutout on both sides,
// plus padding that keeps it centered on the physical screen when Android leaves the cutout
// strip out of the view.
export const fullscreenBox = ({ screen, root, insets }) => {
  const cutout = Math.max(insets.left, insets.right);
  const screenLong = Math.max(screen.width, screen.height);
  const screenShort = Math.min(screen.width, screen.height);

  // Exactly a cutout's width missing = the cutout strip was left out: pad the other side.
  // Any other difference (split screen, pop-up window, side navigation bar) just centers.
  const missing = screenLong - root.width;
  const cutoutExcluded = cutout > 0 && Math.abs(missing - cutout) < 2;
  const cutoutOnLeft = insets.left >= insets.right;
  const edgePad = !cutoutExcluded
    ? { left: 0, right: 0 }
    : cutoutOnLeft
      ? { left: 0, right: cutout }
      : { left: cutout, right: 0 };

  const usableWidth = root.width - (cutoutExcluded ? cutout : 0);
  const roomWidth = Math.min(usableWidth, screenLong - cutout * 2);
  const roomHeight = Math.min(root.height, screenShort);
  const width = Math.floor(Math.max(0, Math.min(roomWidth, (roomHeight * 16) / 9)));
  return { box: { width, height: Math.floor((width * 9) / 16) }, edgePad };
};
