import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/hero-touch-scroll.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// Exercise the real event handlers with controlled browser time and display
// frames, including browsers that round scrollY after a subpixel scroll write.
function harness({ y = 0, frameMs = 16, reducedMotion = false, roundScroll = false, zoom = 1 } = {}) {
  let now = 0;
  let frameID = 0;
  let touchStarts = 0;
  let snapCancels = 0;
  const frames = new Map();
  const listeners = new Map();
  const scrolls = [];
  const snaps = [];
  class Element {
    constructor(properties = {}) {
      Object.assign(this, {
        parentElement: null, isContentEditable: false, tagName: 'DIV',
        overflowY: 'visible', overflowX: 'visible', scrollHeight: 0, clientHeight: 0,
        scrollWidth: 0, clientWidth: 0, nativeTouch: false,
      }, properties);
    }
    closest() {
      if (this.isContentEditable || this.nativeTouch || ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName)) return this;
      return this.parentElement?.closest() || null;
    }
  }
  class HTMLElement extends Element {}
  const html = new HTMLElement({ tagName: 'HTML', scrollHeight: 6900 });
  const body = new HTMLElement({ tagName: 'BODY', parentElement: html });
  const target = new HTMLElement({ parentElement: body });
  const requestFrame = fn => { frames.set(++frameID, { fn, at: now + frameMs }); return frameID; };
  const cancelFrame = id => frames.delete(id);
  const win = {
    scrollY: y, innerHeight: 900, visualViewport: { scale: zoom },
    addEventListener(name, fn, options) { listeners.set(name, { fn, options }); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports, window: win, document: { body, documentElement: html },
    Element, HTMLElement, getComputedStyle: element => element,
    performance: { now: () => now }, requestAnimationFrame: requestFrame, cancelAnimationFrame: cancelFrame,
  }, { filename: sourcePath });
  const controller = compiledModule.exports.createHeroTouchScroll({
    getBounds: () => ({ heroTop: 0, projectsTop: 1000 }),
    scrollTo(top) { assert.ok(Number.isFinite(top)); scrolls.push(top); win.scrollY = roundScroll ? Math.round(top) : top; },
    snapTo(direction) { snaps.push({ direction, from: win.scrollY }); },
    onTouchStart() { touchStarts++; }, cancelSnap() { snapCancels++; }, reducedMotion,
  });
  const finger = (touchY, x = 100, identifier = 1) => ({ clientX: x, clientY: touchY, identifier });
  function dispatch(name, touchY, overrides = {}) {
    const event = {
      target, touches: name === 'touchend' ? [] : [finger(touchY)],
      changedTouches: [finger(touchY)], cancelable: true, defaultPrevented: false,
      preventDefault() { if (this.cancelable) this.defaultPrevented = true; }, ...overrides,
    };
    listeners.get(name)?.fn(event);
    return event;
  }
  function advance(ms) {
    const until = now + ms;
    for (let count = 0; ; count++) {
      assert.ok(count < 2000, 'Animation must settle');
      const next = [...frames].filter(([, frame]) => frame.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, frame] = next; now = frame.at; frames.delete(id); frame.fn(now);
    }
    now = until;
  }
  function fling(positions = [380, 345], start = 400) {
    dispatch('touchstart', start);
    for (const position of positions) { advance(16); dispatch('touchmove', position); }
    dispatch('touchend', positions.at(-1));
  }
  return { win, body, Element: HTMLElement, SVGElement: Element, frames, listeners, scrolls, snaps, controller, finger, dispatch, advance, fling, get touchStarts() { return touchStarts; }, get snapCancels() { return snapCancels; } };
}

test('first vertical movement prevents native scrolling before the snap threshold', () => {
  const h = harness();
  assert.equal(h.listeners.get('touchmove').options.passive, false);
  assert.equal(h.listeners.get('touchmove').options.capture, true);
  h.dispatch('touchstart', 400);
  assert.equal(h.dispatch('touchmove', 399).defaultPrevented, true);
  assert.equal(h.snaps.length, 0);
  assert.equal(h.dispatch('touchmove', 360).defaultPrevented, true);
  assert.equal(h.snaps[0].direction, 1);
});

test('small sideways jitter before vertical intent cannot bypass snapping', () => {
  const h = harness();
  h.dispatch('touchstart', 400);
  assert.equal(h.dispatch('touchmove', 399, { touches: [h.finger(399, 102)] }).defaultPrevented, true);
  assert.equal(h.snaps.length, 0);
  assert.equal(h.dispatch('touchmove', 360, { touches: [h.finger(360, 103)] }).defaultPrevented, true);
  assert.equal(h.snaps[0].direction, 1);
});

test('a held touch remains consumed after snap completion and direction changes', () => {
  const h = harness();
  h.dispatch('touchstart', 400); h.dispatch('touchmove', 360);
  h.win.scrollY = 1000; h.advance(1000); // The section snap has completed.
  for (const y of [300, 320, 200, 400, 100]) assert.equal(h.dispatch('touchmove', y).defaultPrevented, true);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.win.scrollY, 1000);
  h.dispatch('touchend', 100); h.advance(3000);
  assert.equal(h.frames.size, 0);
  h.dispatch('touchstart', 300); h.dispatch('touchmove', 340);
  assert.equal(h.snaps[1].direction, -1);
});

test('a large held upward drag docks and starts the hero snap immediately', () => {
  const h = harness({ y: 1400 });
  h.dispatch('touchstart', 300); h.dispatch('touchmove', 400); h.advance(16);
  assert.equal(h.win.scrollY, 1300);
  assert.equal(h.dispatch('touchmove', 800).defaultPrevented, true);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.snaps[0].direction, -1);
  assert.equal(h.snaps[0].from, 1000);
});

test('drag writes are batched per frame and preserve subpixels across rounded scrollY', () => {
  const h = harness({ y: 1600, roundScroll: true });
  h.dispatch('touchstart', 400);
  h.dispatch('touchmove', 380.5); h.dispatch('touchmove', 380.25);
  assert.equal(h.scrolls.length, 0);
  h.advance(16);
  assert.equal(h.scrolls.length, 1);
  assert.equal(h.scrolls[0], 1619.75);
  assert.equal(h.win.scrollY, 1620);
  h.dispatch('touchmove', 379.75); h.advance(16);
  assert.equal(h.scrolls[1], 1620.25);
});

test('release momentum decays monotonically and is independent of refresh rate', () => {
  const slower = harness({ y: 1600, frameMs: 16 });
  const faster = harness({ y: 1600, frameMs: 8 });
  slower.fling(); faster.fling();
  const releaseY = slower.win.scrollY;
  const releaseIndex = slower.scrolls.length;
  slower.advance(160); faster.advance(160);
  assert.ok(slower.win.scrollY > releaseY);
  assert.ok(Math.abs(slower.win.scrollY - faster.win.scrollY) < 1e-9);
  const positions = slower.scrolls.slice(releaseIndex);
  const increments = positions.map((top, i) => top - (i ? positions[i - 1] : releaseY));
  assert.ok(increments.every(delta => delta > 0));
  assert.ok(increments.slice(1).every((delta, i) => delta < increments[i]));
  slower.advance(3000); faster.advance(3000);
  assert.equal(slower.frames.size, 0);
  assert.equal(faster.frames.size, 0);
  assert.equal(slower.win.scrollY, faster.win.scrollY);
});

test('holding still before release discards stale velocity', () => {
  const h = harness({ y: 1600 });
  h.dispatch('touchstart', 400); h.advance(16); h.dispatch('touchmove', 300); h.advance(240);
  const stoppedY = h.win.scrollY;
  h.dispatch('touchend', 300); h.advance(3000);
  assert.equal(h.win.scrollY, stoppedY);
  assert.equal(h.frames.size, 0);
});

test('upward momentum docks at Projects and a new touch may return to hero', () => {
  const h = harness({ y: 1300 });
  h.fling([335, 370], 300); h.advance(3000);
  assert.equal(h.win.scrollY, 1000);
  assert.ok(h.scrolls.every(top => top >= 1000));
  assert.equal(h.snaps.length, 0);
  h.dispatch('touchstart', 300); h.dispatch('touchmove', 340);
  assert.equal(h.snaps[0].direction, -1);
});

test('editable, nested-scroll, opt-out, and zoomed gestures remain native', () => {
  for (const properties of [
    { tagName: 'INPUT' }, { isContentEditable: true }, { nativeTouch: true },
    { overflowY: 'auto', scrollHeight: 800, clientHeight: 300 },
    { overflowX: 'scroll', scrollWidth: 800, clientWidth: 300 },
  ]) {
    const h = harness();
    const parent = new h.Element({ parentElement: h.body, ...properties });
    const target = new h.Element({ parentElement: parent });
    h.dispatch('touchstart', 400, { target });
    assert.equal(h.dispatch('touchmove', 360, { target }).defaultPrevented, false);
    assert.equal(h.snaps.length, 0);
    assert.equal(h.scrolls.length, 0);
  }
  const zoomed = harness({ zoom: 2 });
  zoomed.dispatch('touchstart', 400);
  assert.equal(zoomed.dispatch('touchmove', 360).defaultPrevented, false);
});

test('horizontal, pinch, and noncancelable gestures never gain a second scroll owner', () => {
  const horizontal = harness();
  horizontal.dispatch('touchstart', 400);
  assert.equal(horizontal.dispatch('touchmove', 390, { touches: [horizontal.finger(390, 180)] }).defaultPrevented, false);
  assert.equal(horizontal.dispatch('touchmove', 200).defaultPrevented, false);
  assert.equal(horizontal.snaps.length, 0);
  const pinch = harness({ y: 1600 });
  pinch.dispatch('touchstart', 400); pinch.dispatch('touchmove', 360); pinch.advance(16);
  const stoppedY = pinch.win.scrollY;
  const touches = [pinch.finger(320), pinch.finger(320, 200, 2)];
  assert.equal(pinch.dispatch('touchmove', 320, { touches }).defaultPrevented, false);
  pinch.dispatch('touchend', 320); pinch.advance(3000);
  assert.equal(pinch.win.scrollY, stoppedY);
  const native = harness();
  native.dispatch('touchstart', 400);
  assert.equal(native.dispatch('touchmove', 360, { cancelable: false }).defaultPrevented, false);
  assert.equal(native.dispatch('touchmove', 320).defaultPrevented, false);
  assert.equal(native.snaps.length, 0);
});

test('new touches and explicit cancellation stop release momentum', () => {
  for (const cancel of [h => h.dispatch('touchstart', 400), h => h.controller.cancel()]) {
    const h = harness({ y: 1600 });
    h.fling(); h.advance(80); cancel(h);
    const stoppedY = h.win.scrollY;
    h.advance(1000);
    assert.equal(h.win.scrollY, stoppedY);
    assert.equal(h.frames.size, 0);
  }
  const h = harness({ y: 1600 });
  h.dispatch('touchstart', 400); h.dispatch('touchmove', 360); h.advance(16);
  h.dispatch('touchcancel', 360); h.dispatch('touchend', 360); h.advance(1000);
  assert.equal(h.win.scrollY, 1640);
  assert.equal(h.frames.size, 0);
});

test('reduced motion retains direct drag and snapping without release momentum', () => {
  const h = harness({ y: 1600, reducedMotion: true });
  h.fling(); const releasedY = h.win.scrollY; h.advance(3000);
  assert.equal(h.win.scrollY, releasedY);
  assert.equal(h.frames.size, 0);
  const hero = harness({ reducedMotion: true });
  hero.dispatch('touchstart', 400); hero.dispatch('touchmove', 360);
  assert.equal(hero.snaps[0].direction, 1);
});

test('destroy removes every touch handler and pending animation frame', () => {
  const h = harness({ y: 1600 });
  h.fling(); h.advance(80); h.controller.destroy();
  const stoppedY = h.win.scrollY;
  h.advance(1000);
  assert.equal(h.win.scrollY, stoppedY);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});


test('release momentum follows the latest real direction after reversal', () => {
  const h = harness({ y: 1600 });
  h.fling([360, 320, 330]);
  const releasedY = h.win.scrollY;
  const releaseIndex = h.scrolls.length;
  h.advance(160);
  assert.ok(h.win.scrollY < releasedY);
  const positions = h.scrolls.slice(releaseIndex);
  assert.ok(positions.every((top, i) => top < (i ? positions[i - 1] : releasedY)));
});

test('relinquishing a consumed touch cancels its section snap', () => {
  for (const relinquish of [
    h => h.dispatch('touchcancel', 360),
    h => h.dispatch('touchmove', 340, { touches: [h.finger(340), h.finger(340, 200, 2)] }),
    h => h.dispatch('touchmove', 340, { cancelable: false }),
    h => h.dispatch('touchmove', 340, { defaultPrevented: true }),
  ]) {
    const h = harness();
    h.dispatch('touchstart', 400); h.dispatch('touchmove', 360);
    assert.equal(h.snaps.length, 1);
    relinquish(h);
    assert.equal(h.snapCancels, 1);
    h.dispatch('touchend', 340); h.advance(3000);
    assert.equal(h.frames.size, 0);
    assert.equal(h.scrolls.length, 0);
  }
});

test('gestures originating on an SVG child can still own page scrolling', () => {
  const h = harness();
  const target = new h.SVGElement({ parentElement: h.body, tagName: 'SVG' });
  h.dispatch('touchstart', 400, { target });
  assert.equal(h.dispatch('touchmove', 360, { target }).defaultPrevented, true);
  assert.equal(h.snaps[0].direction, 1);
});
