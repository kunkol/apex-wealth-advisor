'use client';

export default function DemoGuideTab() {
  return (
    <div style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
      <iframe 
        src="/deep-dive-v8.html" 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="AI Agent Security Deep Dive"
      />
    </div>
  );
}
