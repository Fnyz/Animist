import { fullscreenBox } from '../components/fullscreenBox';

const RATIO = 16 / 9;
const noInsets = { left: 0, right: 0 };

// The box must keep 16:9, fit in the space we got, and be centered on the physical screen.
const check = ({ screen, root, insets = noInsets }) => {
  const { box, edgePad } = fullscreenBox({ screen, root, insets });
  expect(box.width / box.height).toBeCloseTo(RATIO, 1);
  expect(box.width).toBeLessThanOrEqual(root.width - edgePad.left - edgePad.right);
  expect(box.height).toBeLessThanOrEqual(root.height);
  return { box, edgePad };
};

describe('fullscreenBox', () => {
  it('Redmi Note 11 (20:9, cutout left out of the view): full height, centered', () => {
    const { box, edgePad } = check({
      screen: { width: 872.7, height: 392.7 },
      root: { width: 838.9, height: 392.7 },
      insets: { left: 33.8, right: 0 },
    });
    expect(box.height).toBe(392);
    expect(edgePad).toEqual({ left: 0, right: 33.8 });
  });

  it('same phone when the view includes the cutout strip: no extra padding', () => {
    const { edgePad } = check({
      screen: { width: 872.7, height: 392.7 },
      root: { width: 872.7, height: 392.7 },
      insets: { left: 33.8, right: 0 },
    });
    expect(edgePad).toEqual({ left: 0, right: 0 });
  });

  it('cutout on the right (phone turned the other way)', () => {
    const { edgePad } = check({
      screen: { width: 872.7, height: 392.7 },
      root: { width: 838.9, height: 392.7 },
      insets: { left: 0, right: 33.8 },
    });
    expect(edgePad).toEqual({ left: 33.8, right: 0 });
  });

  it('21:9 phone without a cutout: full height, bars on the sides', () => {
    const { box } = check({ screen: { width: 914, height: 392 }, root: { width: 914, height: 392 } });
    // Rounded down by at most 1dp so it never exceeds the screen.
    expect(box.height).toBeGreaterThanOrEqual(391);
  });

  it('exactly 16:9 screen: fills it', () => {
    const { box } = check({ screen: { width: 640, height: 360 }, root: { width: 640, height: 360 } });
    expect(box).toEqual({ width: 640, height: 360 });
  });

  it('4:3 tablet: full width, bars top and bottom', () => {
    const { box } = check({ screen: { width: 1024, height: 768 }, root: { width: 1024, height: 768 } });
    expect(box.width).toBe(1024);
    expect(box.height).toBeLessThan(768);
  });

  it('16:10 tablet', () => {
    check({ screen: { width: 1280, height: 800 }, root: { width: 1280, height: 800 } });
  });

  it('split screen: never larger than the half it got', () => {
    const { box, edgePad } = check({
      screen: { width: 872.7, height: 392.7 },
      root: { width: 430, height: 392.7 },
      insets: { left: 33.8, right: 0 },
    });
    expect(box.width).toBeLessThanOrEqual(430);
    expect(edgePad).toEqual({ left: 0, right: 0 });
  });

  it('side navigation bar takes some width: still fits', () => {
    check({ screen: { width: 872.7, height: 392.7 }, root: { width: 824, height: 392.7 } });
  });

  it('foldable inner screen (almost square)', () => {
    const { box } = check({ screen: { width: 884, height: 820 }, root: { width: 884, height: 820 } });
    expect(box.width).toBe(884);
  });
});
