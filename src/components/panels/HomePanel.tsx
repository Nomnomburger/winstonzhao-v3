'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const imgContainer = "http://localhost:3845/assets/dcbaa7f5003a0420024277458e92f4ab7c6314de.svg";

export default function HomePanel() {
  const router = useRouter();
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('220.84px');

  useEffect(() => {
    const updateFontSize = () => {
      if (headerRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const text = headerRef.current.textContent || '';
        
        // Create a temporary element to measure text width
        const measureEl = document.createElement('span');
        measureEl.style.visibility = 'hidden';
        measureEl.style.position = 'absolute';
        measureEl.style.whiteSpace = 'nowrap';
        measureEl.style.fontFamily = getComputedStyle(headerRef.current).fontFamily;
        measureEl.style.fontWeight = getComputedStyle(headerRef.current).fontWeight;
        measureEl.style.letterSpacing = '-0.05em';
        measureEl.textContent = text;
        document.body.appendChild(measureEl);
        
        // Binary search for the right font size
        let minSize = 10;
        let maxSize = 500;
        let bestSize = 220.84;
        
        for (let i = 0; i < 20; i++) {
          const testSize = (minSize + maxSize) / 2;
          measureEl.style.fontSize = `${testSize}px`;
          const textWidth = measureEl.offsetWidth;
          
          if (Math.abs(textWidth - containerWidth) < 1) {
            bestSize = testSize;
            break;
          } else if (textWidth < containerWidth) {
            minSize = testSize;
            bestSize = testSize;
          } else {
            maxSize = testSize;
          }
        }
        
        document.body.removeChild(measureEl);
        setFontSize(`${bestSize}px`);
      }
    };

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, []);

  return (
    <div className="bg-white flex flex-col items-center justify-between min-h-screen w-full">
      <div className="flex flex-col items-start grow p-9 w-full">
        <div className="flex flex-col gap-12 items-start w-full">
          {/* Header Content */}
          <div ref={containerRef} className="flex items-start px-0 py-2 w-full">
            <h1 
              ref={headerRef}
              className="font-medium text-black whitespace-nowrap leading-none"
              style={{
                fontSize: fontSize,
                letterSpacing: '-0.05em',
                marginTop: '-0.15em',
                marginBottom: '-0.1em',
              }}
            >
              Winston Zhao
            </h1>
          </div>

          {/* Roles and Projects Section */}
          <div className="flex gap-12 items-center w-full">
            <div className="grow font-normal text-base text-black text-left">
              <p className="mb-0">Product Design @ Yelo</p>
              <p>Campus Leader @ Figma</p>
            </div>
            <button
              onClick={() => router.push('/projects')}
              className="flex gap-3 items-start font-medium text-black whitespace-nowrap cursor-pointer"
            >
              <span className="text-2xl leading-normal">16</span>
              <span className="text-[64px] leading-none tracking-[-2.56px]">
                projects ↗
              </span>
            </button>
          </div>

          {/* Bio Section */}
          <div className="flex gap-16 items-start">
            <div className="font-normal leading-none text-[64px] text-black whitespace-nowrap tracking-[-2.56px]">
              <p className="mb-0">product designer</p>
              <p className="mb-0">blending form and function</p>
              <p className="mb-0">currently studying at the</p>
              <p>University of Waterloo</p>
            </div>
            <div className="w-9 h-9 shrink-0">
              <img alt="" className="block w-full h-full" src={imgContainer} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

