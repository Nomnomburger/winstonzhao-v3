'use client';

import dynamic from 'next/dynamic';

// pdf.js needs browser APIs, so the viewer must only render on the client
const ResumeViewer = dynamic(() => import('@/components/ResumeViewer'), {
  ssr: false,
});

export default function ResumePage() {
  return <ResumeViewer />;
}
