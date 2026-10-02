'use client';

import { useLayoutEffect } from 'react';

type Color = [number, number, number, number];
type Bitmap = { width: number; height: number; pixels: Uint8ClampedArray };
type ImageSample = { image: HTMLImageElement; bitmap: Bitmap | null };
const NAVIGATION = '[data-site-navigation], [data-navigation-contrast]';
const VARIABLES = ['--navigation-name-color', '--navigation-menu-color'] as const;
const BITMAP_SIZE = 384;

function samplingUrl(url: string) {
  const source = new URL(url, location.href);
  // Sanity photos render without CORS access. Read a small same-origin copy
  // through the image loader already configured for this host.
  return source.protocol === 'https:' && source.hostname === 'cdn.sanity.io'
    ? `/_next/image?url=${encodeURIComponent(source.href)}&w=${BITMAP_SIZE}&q=75`
    : url;
}

function luminance([r, g, b]: Color) {
  const linear = (channel: number) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function readBitmap(source: CanvasImageSource, width: number, height: number): Bitmap | null {
  if (!width || !height) return null;
  const scale = Math.min(1, BITMAP_SIZE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { width, height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

// Object position is an offset within the space left by cover/contain.
function positionOffset(value: string, space: number) {
  if (value === 'left' || value === 'top') return 0;
  if (value === 'right' || value === 'bottom') return space;
  if (value === 'center') return space / 2;
  const calculation = value.match(/^calc\(([-\d.]+)%\s*([+-])\s*([\d.]+)px\)$/);
  if (calculation) return space * Number(calculation[1]) / 100 + Number(calculation[3]) * (calculation[2] === '-' ? -1 : 1);
  return value.endsWith('%') ? space * parseFloat(value) / 100 : parseFloat(value) || 0;
}

function bitmapColor(bitmap: Bitmap, box: DOMRect, style: CSSStyleDeclaration, x: number, y: number): Color | null {
  const cover = Math.max(box.width / bitmap.width, box.height / bitmap.height);
  const contain = Math.min(box.width / bitmap.width, box.height / bitmap.height);
  const scale = style.objectFit === 'cover' ? cover : style.objectFit === 'none' ? 1 : style.objectFit === 'scale-down' ? Math.min(1, contain) : contain;
  const width = style.objectFit === 'fill' ? box.width : bitmap.width * scale;
  const height = style.objectFit === 'fill' ? box.height : bitmap.height * scale;
  const position = style.objectPosition.match(/calc\([^)]*\)|[^\s]+/g) ?? ['50%', '50%'];
  const u = (x - box.left - positionOffset(position[0], box.width - width)) / width;
  const v = (y - box.top - positionOffset(position[1] ?? '50%', box.height - height)) / height;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
  const scaleDown = Math.min(1, BITMAP_SIZE / Math.max(bitmap.width, bitmap.height));
  const sampleWidth = Math.max(1, Math.round(bitmap.width * scaleDown));
  const sampleHeight = Math.max(1, Math.round(bitmap.height * scaleDown));
  const index = (Math.min(sampleHeight - 1, Math.floor(v * sampleHeight)) * sampleWidth + Math.min(sampleWidth - 1, Math.floor(u * sampleWidth))) * 4;
  return [bitmap.pixels[index] / 255, bitmap.pixels[index + 1] / 255, bitmap.pixels[index + 2] / 255, bitmap.pixels[index + 3] / 255];
}

// Each control gets one solid color from the content beneath its own bounds.
export default function useNavigationContrast(pathname: string, open: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = VARIABLES.map((variable) => root.style.getPropertyValue(variable));
    const images = new Map<string, ImageSample>();
    const blockedVideos = new WeakMap<HTMLVideoElement, string>();
    const colors = new Map<string, Color>();
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = 1;
    const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
    let active = true;
    let frame = 0;

    const parseColor = (value: string): Color => {
      const cached = colors.get(value);
      if (cached) return cached;
      if (!colorContext) return [0, 0, 0, 0];
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = value;
      colorContext.fillRect(0, 0, 1, 1);
      const data = colorContext.getImageData(0, 0, 1, 1).data;
      const color: Color = [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
      colors.set(value, color);
      return color;
    };

    const imageBitmap = (url: string): Bitmap | null => {
      if (!url) return null;
      const cached = images.get(url);
      if (cached) return cached.bitmap;
      const image = new Image();
      const sample: ImageSample = { image, bitmap: null };
      images.set(url, sample);
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (!active) return;
        try { sample.bitmap = readBitmap(image, image.naturalWidth, image.naturalHeight); }
        catch { /* Unsupported CORS sources retain the page-color fallback. */ }
        schedule();
      };
      image.src = samplingUrl(url);
      return null;
    };

    const sample = () => {
      frame = 0;
      if (!active || document.hidden) return;
      const styles = new WeakMap<Element, CSSStyleDeclaration>();
      const opacities = new WeakMap<Element, number>();
      const boxes = new WeakMap<Element, DOMRect>();
      const videos = new WeakMap<HTMLVideoElement, Bitmap | null>();
      const styleOf = (element: Element) => {
        let style = styles.get(element);
        if (!style) { style = getComputedStyle(element); styles.set(element, style); }
        return style;
      };
      const opacityOf = (element: Element): number => {
        const cached = opacities.get(element);
        if (cached !== undefined) return cached;
        const style = styleOf(element);
        const opacity = style.visibility === 'hidden' || style.display === 'none' ? 0 : Number(style.opacity) * (element.parentElement ? opacityOf(element.parentElement) : 1);
        opacities.set(element, opacity);
        return opacity;
      };
      const boxOf = (element: Element) => {
        let box = boxes.get(element);
        if (!box) { box = element.getBoundingClientRect(); boxes.set(element, box); }
        return box;
      };
      const bodyColor = parseColor(styleOf(document.body).backgroundColor);
      const fallback = bodyColor[3] > 0 ? bodyColor : parseColor(styleOf(root).getPropertyValue('--background').trim());

      // Prepare nearby photos before scrolling places them under the controls.
      for (const image of document.images) {
        if (!image.complete || !image.naturalWidth || image.closest(NAVIGATION) || opacityOf(image) === 0) continue;
        const box = boxOf(image);
        if (box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight * 2) {
          imageBitmap(image.currentSrc || image.src);
        }
      }

      const videoBitmap = (video: HTMLVideoElement) => {
        if (videos.has(video)) return videos.get(video) ?? null;
        let bitmap: Bitmap | null = null;
        const source = video.currentSrc || video.src;
        if (video.readyState >= 2 && blockedVideos.get(video) !== source) {
          try { bitmap = readBitmap(video, video.videoWidth, video.videoHeight); }
          catch { blockedVideos.set(video, source); }
        }
        bitmap ??= imageBitmap(video.poster);
        videos.set(video, bitmap);
        return bitmap;
      };

      const colorAt = (x: number, y: number): Color => {
        const result: Color = [0, 0, 0, 0];
        let remaining = 1;
        const add = (color: Color, opacity: number) => {
          const alpha = Math.min(1, color[3] * opacity);
          for (let channel = 0; channel < 3; channel++) result[channel] += remaining * alpha * color[channel];
          remaining *= 1 - alpha;
        };
        for (const element of document.elementsFromPoint(x, y)) {
          if (element.closest(NAVIGATION)) continue;
          const opacity = opacityOf(element);
          if (opacity === 0) continue;
          const style = styleOf(element);
          const bitmap = element instanceof HTMLImageElement ? imageBitmap(element.currentSrc || element.src) : element instanceof HTMLVideoElement ? videoBitmap(element) : null;
          if (bitmap) {
            const color = bitmapColor(bitmap, boxOf(element), style, x, y);
            if (color) add(color, opacity);
          }
          add(parseColor(style.backgroundColor), opacity);
          if (remaining < 0.001) break;
        }
        add(fallback, 1);
        result[3] = 1;
        return result;
      };

      const visible = (element: Element) => opacityOf(element) > 0.01 && boxOf(element).width > 0 && boxOf(element).height > 0;
      const persistent = document.getElementById('site-navigation-name');
      const name = persistent && visible(persistent)
        ? Array.from(persistent.querySelectorAll('a > span')).filter(visible)
        : Array.from(document.querySelectorAll('[data-navigation-name]')).filter(visible);
      const button = document.querySelector('#site-navigation-toggle button');
      const controls = [name, button && visible(button) ? [button] : []];
      controls.forEach((elements, index) => {
        const samples: number[] = [];
        for (const element of elements) {
          const box = boxOf(element);
          for (const horizontal of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            for (const vertical of [0.25, 0.5, 0.75]) {
              const x = box.left + box.width * horizontal;
              const y = box.top + box.height * vertical;
              if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) continue;
              samples.push(luminance(colorAt(x, y)));
            }
          }
        }
        // Follow the predominant local background so a few bright highlights
        // or page margins cannot outweigh a dark photo (or vice versa).
        samples.sort((a, b) => a - b);
        const background = samples[Math.floor(samples.length / 2)];
        const color = samples.length ? background > Math.sqrt(1.05 * 0.05) - 0.05 ? '#000000' : '#ffffff' : 'var(--navigation-foreground)';
        if (root.style.getPropertyValue(VARIABLES[index]) !== color) root.style.setProperty(VARIABLES[index], color);
      });
    };

    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(sample);
    };
    let theme = root.style.getPropertyValue('--background');
    const observer = new MutationObserver(() => {
      const nextTheme = root.style.getPropertyValue('--background');
      if (nextTheme !== theme) { theme = nextTheme; schedule(); }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    document.addEventListener('load', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    const timer = window.setInterval(schedule, 250);
    sample();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      clearInterval(timer);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('load', schedule, true);
      document.removeEventListener('visibilitychange', schedule);
      images.forEach(({ image }) => { image.onload = null; });
      VARIABLES.forEach((variable, index) => {
        if (previous[index]) root.style.setProperty(variable, previous[index]);
        else root.style.removeProperty(variable);
      });
    };
  }, [pathname, open]);
}
