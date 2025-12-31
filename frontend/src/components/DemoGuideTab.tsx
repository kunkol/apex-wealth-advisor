'use client';

export default function DemoGuideTab() {
  return (
    <div className="h-full w-full">
      <iframe 
        src="/deep-dive-v8.html" 
        className="w-full h-full border-0"
        title="AI Agent Security Deep Dive"
      />
    </div>
  );
}
