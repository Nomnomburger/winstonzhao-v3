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
function harness({ y = 0, frameMs = 16, reducedMotion = false, roundScroll = false, zoom = 1, touchActionSupported = true, ready = true, activeSnap = null } = {}) {
  let now = 0;
  let frameID = 0;
  let touchStarts = 0;
  let snapCancels = 0;
  let layoutReads = 0;
  let styleWrites = 0;
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
  let touchAction = '';
  const properties = new Map();
  const style = {
    get touchAction() { return touchAction; },
    set touchAction(value) { styleWrites++; if (touchActionSupported) touchAction = value; },
    getPropertyValue(name) { return properties.get(name) || ''; },
    setProperty(name, value) { styleWrites++; properties.set(name, value); },
    removeProperty(name) { properties.delete(name); },
  };
  const html = new HTMLElement({ tagName: 'HTML', scrollHeight: 6900, style });
  let contentHeight = html.scrollHeight;
  Object.defineProperty(html, 'scrollHeight', {
    get() { layoutReads++; return contentHeight; },
    set(value) { contentHeight = value; },
  });
  const body = new HTMLElement({ tagName: 'BODY', parentElement: html });
  const target = new HTMLElement({ parentElement: body });
  const requestFrame = fn => { frames.set(++frameID, { fn, at: now + frameMs }); return frameID; };
  const cancelFrame = id => frames.delete(id);
  const win = {
    scrollY: y, innerHeight: 900, visualViewport: {
      scale: zoom,
      addEventListener(name, fn) { listeners.set(`viewport:${name}`, { fn }); },
      removeEventListener(name) { listeners.delete(`viewport:${name}`); },
    },
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
    canSnap: () => ready,
    getSnapDirection: () => activeSnap,
    getBounds: () => ({ heroTop: 0, projectsTop: 1000 }),
    scrollTo(top) { assert.ok(Number.isFinite(top)); scrolls.push(top); win.scrollY = roundScroll ? Math.round(top) : top; },
    snapTo(direction) { snaps.push({ direction, from: win.scrollY }); activeSnap = direction; },
    onTouchStart() { touchStarts++; }, cancelSnap() { snapCancels++; activeSnap = null; }, reducedMotion,
  });
  const finger = (touchY, x = 100, identifier = 1) => ({ clientX: x, clientY: touchY, identifier });
  function dispatch(name, touchY, overrides = {}) {
    const event = {
      target, touches: name === 'touchend' ? [] : [finger(touchY)],
      changedTouches: [finger(touchY)], cancelable: true, defaultPrevented: false,
      pointerType: 'touch', isPrimary: true, clientX: 100, clientY: touchY,
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
  return { win, body, style, Element: HTMLElement, SVGElement: Element, frames, listeners, scrolls, snaps, controller, finger, dispatch, advance, fling, setReady(value) { ready = value; controller.refresh(); }, finishSnap(direction) { win.scrollY = direction === 1 ? 1000 : 0; activeSnap = null; }, get touchStarts() { return touchStarts; }, get snapCancels() { return snapCancels; }, get layoutReads() { return layoutReads; }, get styleWrites() { return styleWrites; } };
}

test('an early held swipe waits for the intro and snaps once without native scrolling', () => {
  const h = harness({ ready: false });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 399);
  for (const y of [370, 340, 300]) assert.equal(h.dispatch('touchmove', y).defaultPrevented, true);
  h.advance(1000);
  assert.equal(h.win.scrollY, 0);
  assert.equal(h.snaps.length, 0);
  h.setReady(true);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.snaps[0].direction, 1);
  h.controller.refresh();
  h.win.scrollY = 1000;
  h.advance(1000);
  h.dispatch('pointermove', 250);
  h.dispatch('touchmove', 200);
  assert.equal(h.win.scrollY, 1000);
  assert.equal(h.snaps.length, 1);
});

test('an early released swipe retains its snap intent but cancellation discards it', () => {
  const h = harness({ ready: false });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 399);
  assert.equal(h.dispatch('touchend', 399).defaultPrevented, true);
  h.advance(1000);
  h.setReady(true);
  assert.equal(h.snaps.length, 1);
  for (const cancel of [h => h.controller.cancel(), h => h.dispatch('touchcancel', 399)]) {
    const canceled = harness({ ready: false });
    canceled.dispatch('touchstart', 400);
    canceled.dispatch('pointermove', 399);
    cancel(canceled);
    canceled.setReady(true);
    assert.equal(canceled.snaps.length, 0);
  }
});

test('first pixel of vertical touch movement snaps in either direction while held', () => {
  for (const [y, next, direction] of [[0, 399, 1], [1000, 401, -1]]) {
    const h = harness({ y });
    assert.equal(h.style.touchAction, 'pan-x pinch-zoom');
    assert.equal(h.listeners.get('touchmove').options.passive, false);
    assert.equal(h.listeners.get('touchmove').options.capture, true);
    h.dispatch('touchstart', 400);
    assert.equal(h.dispatch('touchmove', next).defaultPrevented, true);
    assert.equal(h.snaps.length, 1);
    assert.equal(h.snaps[0].direction, direction);
  }
});

test('touch pointer movement starts snapping before the browser delivers touchmove', () => {
  for (const [y, next, direction] of [[0, 399, 1], [1000, 401, -1]]) {
    const h = harness({ y });
    h.dispatch('touchstart', 400);
    h.dispatch('pointermove', next);
    assert.equal(h.snaps.length, 1);
    assert.equal(h.snaps[0].direction, direction);
    h.win.scrollY = direction === 1 ? 1000 : 0;
    h.advance(1200);
    h.dispatch('pointermove', next - 50);
    assert.equal(h.dispatch('touchmove', next - 50).defaultPrevented, true);
    assert.equal(h.snaps.length, 1);
  }
});

test('mouse, pen, and secondary touch pointers never start a section snap', () => {
  const h = harness();
  h.dispatch('touchstart', 400);
  for (const properties of [{ pointerType: 'mouse' }, { pointerType: 'pen' }, { isPrimary: false }]) {
    h.dispatch('pointermove', 360, properties);
  }
  assert.equal(h.snaps.length, 0);
  h.dispatch('touchmove', 399);
  assert.equal(h.snaps.length, 1);
});

test('releasing a tiny vertical swipe suppresses a tap while stationary contacts retain clicks', () => {
  const swipe = harness();
  swipe.dispatch('touchstart', 400);
  swipe.dispatch('pointermove', 399);
  assert.equal(swipe.dispatch('touchend', 399).defaultPrevented, true);
  const tap = harness();
  tap.dispatch('touchstart', 400);
  assert.equal(tap.dispatch('touchend', 400).defaultPrevented, false);
  const horizontal = harness();
  horizontal.dispatch('touchstart', 400);
  horizontal.dispatch('pointermove', 400, { clientX: 150 });
  assert.equal(horizontal.dispatch('touchend', 400).defaultPrevented, false);
});

test('pointer and touch deliveries of the same position never double a drag', () => {
  const h = harness({ y: 1600 });
  h.dispatch('touchstart', 400);
  h.advance(16);
  h.dispatch('pointermove', 399);
  h.dispatch('touchmove', 399);
  h.advance(16);
  assert.equal(h.win.scrollY, 1601);
  h.dispatch('pointermove', 370);
  h.dispatch('touchmove', 370);
  h.advance(16);
  assert.equal(h.win.scrollY, 1630);
});

test('a gesture uses one coordinate stream even when the other delivers older positions', () => {
  for (const [owner, delayed] of [['pointermove', 'touchmove'], ['touchmove', 'pointermove']]) {
    const h = harness({ y: 1000 });
    h.dispatch('touchstart', 400);
    h.advance(16);
    h.dispatch(owner, 370);
    h.dispatch(delayed, 390);
    h.advance(16);
    assert.equal(h.win.scrollY, 1030);
    assert.equal(h.snaps.length, 0);
    h.dispatch(owner, 350);
    h.dispatch(delayed, 370);
    h.advance(16);
    assert.equal(h.win.scrollY, 1050);
    assert.equal(h.snaps.length, 0);
    h.dispatch('touchend', 350);
    h.advance(160);
    assert.ok(h.win.scrollY > 1050, 'Release momentum follows the authoritative movement');
  }
});

test('small corrections during a downward gesture cannot snap back to hero', () => {
  for (const event of ['pointermove', 'touchmove']) {
    const h = harness({ y: 1000 });
    h.dispatch('touchstart', 400);
    for (const y of [399, 400, 399, 402, 400, 403]) {
      h.advance(16);
      h.dispatch(event, y);
      h.advance(16);
      assert.equal(h.snaps.length, 0);
      assert.ok(h.win.scrollY >= 1000, 'Corrections stay at the Projects dock');
    }
    h.dispatch('touchend', 403);
    h.advance(3000);
    assert.equal(h.snaps.length, 0);
    assert.ok(h.win.scrollY >= 1000);
  }
});

test('a deliberate reversal can return to hero during the same held gesture', () => {
  const h = harness({ y: 1000 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 370);
  h.advance(16);
  h.dispatch('pointermove', 375);
  h.advance(16);
  assert.equal(h.snaps.length, 0);
  h.dispatch('pointermove', 382);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.snaps[0].direction, -1);
  h.dispatch('pointermove', 360);
  assert.equal(h.snaps.length, 1, 'The snap remains latched while held');
});

test('a new upward contact still returns immediately after a corrected downward gesture', () => {
  const h = harness({ y: 1000 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 399);
  h.dispatch('pointermove', 400);
  h.advance(160);
  h.dispatch('touchend', 400);
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 401);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.snaps[0].direction, -1);
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
  h.finishSnap(1); h.advance(1000);
  for (const y of [300, 320, 200, 400, 100]) assert.equal(h.dispatch('touchmove', y).defaultPrevented, true);
  assert.equal(h.snaps.length, 1);
  assert.equal(h.win.scrollY, 1000);
  h.dispatch('touchend', 100); h.advance(3000);
  assert.equal(h.frames.size, 0);
  h.dispatch('touchstart', 300); h.dispatch('touchmove', 340);
  assert.equal(h.snaps[1].direction, -1);
});

test('a fresh vertical contact redirects an opposite snap and keeps same-direction animations running', () => {
  for (const activeSnap of [-1, 1]) {
    for (const direction of [-1, 1]) {
      for (const event of ['pointermove', 'touchmove']) {
        const h = harness({ y: 350, activeSnap });
        h.dispatch('touchstart', 400);
        h.win.scrollY = 550; // Animation advanced after contact, before movement.
        h.dispatch(event, 400 - direction);
        assert.equal(h.snaps.length, activeSnap === direction ? 0 : 1);
        if (activeSnap !== direction) {
          assert.equal(h.snaps[0].direction, direction);
          assert.equal(h.snaps[0].from, 550);
        }
        assert.equal(h.scrolls.length, 0, 'Retargeting does not jump to a section');
        h.dispatch('touchend', 400 - direction);
        assert.equal(h.snapCancels, 0, 'Release leaves the section animation running');
      }
    }
  }
});

test('a downward continuation can drag Projects after arrival without replaying consumed travel', () => {
  for (const activeSnap of [-1, 1]) {
    const h = harness({ y: 550, activeSnap });
    h.dispatch('touchstart', 400);
    h.dispatch('pointermove', 399);
    const startedSnaps = h.snaps.length;
    h.dispatch('pointermove', 300);
    h.dispatch('touchmove', 350); // Stale secondary delivery remains ignored.
    assert.equal(h.scrolls.length, 0);
    h.finishSnap(1);
    h.advance(16);
    h.dispatch('pointermove', 290);
    h.advance(16);
    assert.equal(h.win.scrollY, 1010);
    h.dispatch('pointermove', 291);
    h.advance(16);
    assert.equal(h.snaps.length, startedSnaps, 'A small correction cannot return to Hero');
    h.dispatch('pointermove', 270);
    h.advance(16);
    assert.equal(h.win.scrollY, 1030);
  }
});

test('an upward continuation stays anchored at Hero while the finger remains held', () => {
  const h = harness({ y: 550, activeSnap: 1 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 401);
  h.finishSnap(-1);
  for (const y of [450, 350, 250]) h.dispatch('pointermove', y);
  h.advance(3000);
  assert.equal(h.win.scrollY, 0);
  assert.equal(h.snaps.length, 1);
});

test('a contact moving after the previous snap finishes uses the settled section position', () => {
  const down = harness({ y: 550, activeSnap: 1 });
  down.dispatch('touchstart', 400);
  down.finishSnap(1);
  down.dispatch('pointermove', 380);
  down.advance(16);
  assert.equal(down.win.scrollY, 1020);
  assert.equal(down.snaps.length, 0);
  const up = harness({ y: 550, activeSnap: -1 });
  up.dispatch('touchstart', 400);
  up.finishSnap(-1);
  up.dispatch('pointermove', 399);
  assert.equal(up.snaps[0].direction, 1);
  assert.equal(up.snaps[0].from, 0);
});

test('a forward contact above the dock cancels a return and drags from the visible position', () => {
  const h = harness({ y: 1030, activeSnap: -1 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 390);
  h.advance(16);
  assert.equal(h.win.scrollY, 1040);
  assert.equal(h.snapCancels, 1);
  assert.equal(h.snaps.length, 0);
});

test('continuation release cannot reuse velocity from travel consumed by the snap', () => {
  const h = harness({ y: 550, activeSnap: 1 });
  h.dispatch('touchstart', 400);
  h.advance(16); h.dispatch('pointermove', 399);
  h.advance(16); h.dispatch('pointermove', 250);
  h.finishSnap(1);
  h.advance(16); h.dispatch('pointermove', 240);
  h.dispatch('touchend', 240);
  assert.equal(h.win.scrollY, 1010);
  h.advance(3000);
  assert.equal(h.win.scrollY, 1010);
  assert.equal(h.frames.size, 0);
});

test('continuation momentum matches an ordinary project drag with the same new movement', () => {
  const continuation = harness({ y: 550, activeSnap: 1 });
  continuation.dispatch('touchstart', 400);
  continuation.advance(16); continuation.dispatch('pointermove', 399);
  continuation.advance(16); continuation.dispatch('pointermove', 250);
  continuation.finishSnap(1);
  const ordinary = harness({ y: 1000 });
  ordinary.dispatch('touchstart', 250);
  for (const h of [continuation, ordinary]) {
    h.advance(16); h.dispatch('pointermove', 240);
    h.advance(16); h.dispatch('pointermove', 230);
    h.dispatch('touchend', 230);
    assert.equal(h.win.scrollY, 1020);
    h.advance(3000);
  }
  assert.equal(continuation.win.scrollY, ordinary.win.scrollY);
});

test('stationary and horizontal contacts keep the existing section animation running', () => {
  for (const activeSnap of [-1, 1]) {
    const tap = harness({ y: 550, activeSnap });
    tap.dispatch('touchstart', 400);
    tap.dispatch('touchend', 400);
    assert.equal(tap.snapCancels, 0);
    assert.equal(tap.snaps.length, 0);
    const horizontal = harness({ y: 550, activeSnap });
    horizontal.dispatch('touchstart', 400);
    horizontal.dispatch('pointermove', 400, { clientX: 150 });
    horizontal.dispatch('pointercancel', 400);
    assert.equal(horizontal.snapCancels, 0);
    assert.equal(horizontal.snaps.length, 0);
  }
});

test('native contacts relinquish an active snap while normal single-finger contacts retain it', () => {
  for (const activeSnap of [-1, 1]) {
    for (const overrides of [
      h => ({ touches: [h.finger(400), h.finger(400, 200, 2)] }),
      h => ({ target: new h.Element({ tagName: 'INPUT', parentElement: h.body }) }),
      h => ({ target: new h.Element({ overflowY: 'auto', scrollHeight: 800, clientHeight: 300, parentElement: h.body }) }),
      () => ({ defaultPrevented: true }),
    ]) {
      const h = harness({ y: 550, activeSnap });
      h.dispatch('touchstart', 400, overrides(h));
      assert.equal(h.snapCancels, 1);
      assert.equal(h.dispatch('touchmove', 360).defaultPrevented, false);
    }
    const normal = harness({ y: 550, activeSnap });
    normal.dispatch('touchstart', 400);
    assert.equal(normal.snapCancels, 0);
  }
});

test('zooming cancels an active snap even without a tracked page contact', () => {
  const h = harness({ y: 550, activeSnap: 1 });
  h.win.visualViewport.scale = 2;
  h.dispatch('viewport:resize');
  assert.equal(h.snapCancels, 1);
  assert.equal(h.style.getPropertyValue('--hero-touch-action'), 'auto');
});

test('a prevented first movement relinquishes a retained animation to its other owner', () => {
  const h = harness({ y: 550, activeSnap: 1 });
  h.dispatch('touchstart', 400);
  h.dispatch('touchmove', 399, { defaultPrevented: true });
  assert.equal(h.snapCancels, 1);
  assert.equal(h.snaps.length, 0);
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

test('layout refresh expands the scroll range without dropping a held project drag', () => {
  const h = harness({ y: 5900 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 100);
  h.advance(16);
  assert.equal(h.win.scrollY, 6000);
  h.body.parentElement.scrollHeight = 7900;
  h.controller.refresh();
  h.dispatch('pointermove', 50);
  h.advance(16);
  assert.equal(h.win.scrollY, 6050);
  assert.equal(h.snaps.length, 0);
});

test('toolbar height changes update the scroll range without layout reads or redundant styles', () => {
  const h = harness({ y: 5900 });
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 200);
  h.advance(16);
  assert.equal(h.win.scrollY, 6000);
  const reads = h.layoutReads;
  const writes = h.styleWrites;
  for (let i = 1; i <= 20; i++) {
    h.win.innerHeight = 900 - i * 5;
    h.dispatch('viewport:resize');
    h.controller.resizeViewport();
  }
  h.dispatch('pointermove', 100);
  h.advance(16);
  assert.equal(h.win.scrollY, 6100);
  assert.equal(h.layoutReads, reads);
  assert.equal(h.styleWrites, writes);
  assert.equal(h.snaps.length, 0);
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

test('horizontal, pinch, and unsupported noncancelable gestures remain native', () => {
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
  const native = harness({ touchActionSupported: false });
  native.dispatch('touchstart', 400);
  assert.equal(native.dispatch('touchmove', 360, { cancelable: false }).defaultPrevented, false);
  assert.equal(native.dispatch('touchmove', 320).defaultPrevented, false);
  assert.equal(native.snaps.length, 0);
});

test('declared vertical ownership keeps held snaps running through noncancelable events', () => {
  const h = harness();
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 399);
  h.dispatch('touchmove', 360, { cancelable: false });
  assert.equal(h.snaps.length, 1);
  assert.equal(h.snapCancels, 0);
  h.dispatch('touchend', 360);
});

test('zooming restores native pan and destroy restores the original touch policy', () => {
  const h = harness();
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 399);
  h.win.visualViewport.scale = 2;
  h.dispatch('viewport:resize');
  assert.equal(h.style.touchAction, '');
  assert.equal(h.style.getPropertyValue('--hero-touch-action'), 'auto');
  assert.equal(h.snapCancels, 1);
  h.dispatch('touchstart', 400);
  h.dispatch('pointermove', 360);
  assert.equal(h.dispatch('touchmove', 360).defaultPrevented, false);
  assert.equal(h.snaps.length, 1);
  h.win.visualViewport.scale = 1;
  h.dispatch('viewport:resize');
  assert.equal(h.style.touchAction, 'pan-x pinch-zoom');
  h.controller.destroy();
  assert.equal(h.style.touchAction, '');
  assert.equal(h.style.getPropertyValue('--hero-touch-action'), '');
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
    h => h.dispatch('pointercancel', 360),
    h => h.dispatch('touchmove', 340, { touches: [h.finger(340), h.finger(340, 200, 2)] }),
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
