'use client';

import { useEffect, useRef } from 'react';

export default function DemoGuideTab() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Ensure iframe content is interactive
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        // The HTML file should work on its own with its embedded JS
        console.log('Demo guide loaded');
      };
    }
  }, []);

  return (
    <div className="h-full w-full bg-slate-950">
      <iframe 
        ref={iframeRef}
        src="/deep-dive.html"
        className="w-full h-full border-0"
        title="AI Agent Security Deep Dive"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
