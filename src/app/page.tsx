'use client';

import Image from "next/image";
import { useEffect, useRef } from "react";

const galleryItems = [
  {
    id: 1,
    src: "https://picsum.photos/400/300?random=1",
    alt: "Full Sprint — Heatmap.com",
    title: "Full Sprint — Heatmap.com",
    bgColor: "from-blue-400 to-yellow-400"
  },
  {
    id: 2,
    src: "https://picsum.photos/400/300?random=2",
    alt: "Heatmap.com Redesign",
    title: "Heatmap.com Redesign",
    bgColor: "from-orange-300 to-red-400"
  },
  {
    id: 3,
    src: "https://picsum.photos/400/300?random=3",
    alt: "MuniSync Platform",
    title: "MuniSync Platform",
    bgColor: "from-blue-300 to-purple-400"
  },
  {
    id: 4,
    src: "https://picsum.photos/400/300?random=4",
    alt: "Full Sprint — Heatmap.com",
    title: "Full Sprint — Heatmap.com",
    bgColor: "from-gray-300 to-gray-600"
  }
];

export default function HomeGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Duplicate items for infinite scroll
  const duplicatedItems = [...galleryItems, ...galleryItems, ...galleryItems];
  const itemWidth = 416; // 400px + 16px gap
  const totalWidth = galleryItems.length * itemWidth;
  
  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Start at the middle set (showing the offset like in Figma)
    const initialOffset = -184; // Offset from Figma design
    const middleSetStart = totalWidth + initialOffset;
    
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = middleSetStart;
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [totalWidth]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (!scrollRef.current) return;
      
      // Convert vertical scroll to horizontal
      const scrollAmount = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      scrollRef.current.scrollLeft += scrollAmount;
    };
    
    // Add event listener to the entire page
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);
  
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const currentScroll = scrollRef.current.scrollLeft;
    const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
    
    // Handle infinite scroll boundaries with smooth transitions
    if (currentScroll <= 50) {
      scrollRef.current.scrollLeft = totalWidth + currentScroll;
    } else if (currentScroll >= maxScroll - 50) {
      scrollRef.current.scrollLeft = currentScroll - totalWidth;
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col justify-between w-full p-6 flex-shrink-0">
        {/* Header Content - Name */}
        <div className="flex items-center justify-between w-full mb-16 sm:mb-20">
          <h1 className="header-text">
            Winston
          </h1>
          <h1 className="header-text">
            Zhao
          </h1>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1">
            <span className="nav-text text-black">ALL</span>
            <span className="nav-text text-[#a2a2a2]">CASE STUDY</span>
            <span className="nav-text text-[#a2a2a2]">UI/UX</span>
            <span className="nav-text text-[#a2a2a2]">BRANDING</span>
            <span className="nav-text text-[#a2a2a2]">AWARDS</span>
          </div>
          <div className="flex gap-1">
            <span className="nav-text text-black">GALLERY</span>
            <span className="nav-text text-[#a2a2a2]">LIST</span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          ref={scrollRef}
          className="gallery-container flex gap-4 px-6 overflow-x-auto overflow-y-hidden scrollbar-hide"
          onScroll={handleScroll}
        >
          {duplicatedItems.map((item, index) => (
            <div key={`${item.id}-${Math.floor(index / galleryItems.length)}`} className="flex flex-col gap-2 flex-shrink-0">
              <div className={`w-[400px] h-[300px] bg-gradient-to-br ${item.bgColor} rounded-2xl overflow-hidden`}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="gallery-description">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full p-6 grid grid-cols-[minmax(0px,_1fr)_400px_400px_minmax(0px,_1fr)] gap-4 items-end flex-shrink-0">
        <div className="[grid-area:1_/_1] footer-links self-end">
          <p className="mb-0">About</p>
          <p className="mb-0">Playground</p>
          <p>Contact</p>
        </div>
        
        <div className="[grid-area:1_/_2] gallery-description text-black self-end">
          <p className="mb-0">Campus Leader @ Figma</p>
          <p className="mb-0">President @ GBDA Society</p>
          <p>Co-Founder @ Villio AI</p>
        </div>
        
        <div className="[grid-area:1_/_3] footer-description self-end">
          <p>
            I&apos;m a Global Business & Digital Arts student at the University of 
            Waterloo. As a product designer, I craft software and digital 
            experiences that solve problems and delight users.
          </p>
        </div>
        
        <div className="[grid-area:1_/_4] flex flex-col gap-2.5 items-end justify-end self-end">
          <div className="w-11 h-7 bg-black rounded"></div>
        </div>
      </div>
    </div>
  );
}