'use client';

export default function DemoGuideTab() {
  return (
    <iframe 
      src="/deep-dive-v8.html" 
      sandbox="allow-scripts allow-same-origin"
      style={{ 
        width: '100%', 
        height: 'calc(100vh - 64px)', 
        border: 'none',
        display: 'block'
      }}
      title="AI Agent Security Deep Dive"
    />
  );
}
