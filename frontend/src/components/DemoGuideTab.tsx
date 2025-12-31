'use client';

import { useState } from 'react';

// Simplified version of deep-dive-v8.html content as React component
export default function DemoGuideTab() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section1']));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(['section1', 'section2', 'section3', 'section4', 'section5']));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">AI Agent Security Deep Dive</h1>
            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono">v8</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={expandAll} className="text-xs text-slate-400 hover:text-white transition-colors">
              Expand All
            </button>
            <span className="text-slate-600">|</span>
            <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-white transition-colors">
              Collapse All
            </button>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">Okta + Auth0</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* SECTION 1: THE AI AGENT ERA */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-900/10 overflow-hidden">
          <button
            onClick={() => toggleSection('section1')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-amber-400">The AI Agent Era</h2>
              <p className="text-slate-400 text-sm mt-1">AI adoption is surging. Security and governance have not kept up.</p>
            </div>
            <svg
              className={`w-6 h-6 text-slate-400 transition-transform ${expandedSections.has('section1') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.has('section1') && (
            <div className="px-6 pb-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-600 rounded-xl p-5">
                  <p className="text-xs text-blue-200 mb-2 font-medium uppercase tracking-wide">Adoption</p>
                  <div className="text-5xl font-bold text-white mb-2">91%</div>
                  <p className="text-sm text-blue-100 mb-3">of organizations now use AI agents in production</p>
                  <p className="text-[10px] text-blue-300 border-t border-blue-400/30 pt-2">Okta "AI at Work" Report, 2025</p>
                </div>
                
                <div className="bg-purple-600 rounded-xl p-5">
                  <p className="text-xs text-purple-200 mb-2 font-medium uppercase tracking-wide">Scale</p>
                  <div className="text-5xl font-bold text-white mb-2">100s</div>
                  <p className="text-sm text-purple-100 mb-3">of tool calls per conversation across APIs and SaaS</p>
                  <p className="text-[10px] text-purple-300 border-t border-purple-400/30 pt-2">Maxim AI, MCP Gateway Guide 2025</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Consequence</p>
                  <div className="text-5xl font-bold text-orange-400 mb-2">80%</div>
                  <p className="text-sm text-slate-300 mb-3">experienced unintended agent behavior in production</p>
                  <p className="text-[10px] text-slate-500 border-t border-slate-600 pt-2">The Times "AI Security" Report, 2025</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Gap</p>
                  <div className="text-5xl font-bold text-red-400 mb-2">44%</div>
                  <p className="text-sm text-slate-300 mb-3">have no AI agent governance framework in place</p>
                  <p className="text-[10px] text-slate-500 border-t border-slate-600 pt-2">The Times "AI Security" Report, 2025</p>
                </div>
              </div>

              {/* Talk Track */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">💬 Talk Track</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  "We're in a watershed moment. 91% of enterprises now have AI agents in production, each making hundreds of tool calls per conversation. 
                  But here's the challenge: 80% have already experienced unintended agent behavior, and nearly half have no governance framework. 
                  This is why identity-first AI security isn't optional - it's essential."
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: THE SECURITY CHALLENGE */}
        <div className="rounded-2xl border border-red-500/30 bg-red-900/10 overflow-hidden">
          <button
            onClick={() => toggleSection('section2')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-red-400">The Security Challenge</h2>
              <p className="text-slate-400 text-sm mt-1">Three critical gaps in AI agent security today.</p>
            </div>
            <svg
              className={`w-6 h-6 text-slate-400 transition-transform ${expandedSections.has('section2') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.has('section2') && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 rounded-xl p-5 border border-red-500/30">
                  <div className="text-3xl mb-3">🔓</div>
                  <h3 className="text-lg font-bold text-white mb-2">Authorization Drift</h3>
                  <p className="text-sm text-slate-400">Credentials persist beyond their business context. Agent keeps access after user's role changes.</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-red-500/30">
                  <div className="text-3xl mb-3">👻</div>
                  <h3 className="text-lg font-bold text-white mb-2">Shadow Agents</h3>
                  <p className="text-sm text-slate-400">Unmanaged AI agents operating with elevated privileges outside IT visibility.</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-red-500/30">
                  <div className="text-3xl mb-3">🔗</div>
                  <h3 className="text-lg font-bold text-white mb-2">Token Sprawl</h3>
                  <p className="text-sm text-slate-400">Long-lived tokens scattered across services without centralized management.</p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-red-400 mb-2">💬 Talk Track</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  "These aren't theoretical risks. Authorization drift means an agent keeps Salesforce access even after the user leaves the company. 
                  Shadow agents are AI tools employees spin up with their personal credentials. And token sprawl - that's the 'password in a spreadsheet' 
                  problem at agent scale. Each of these creates audit gaps and compliance exposure."
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: THE OKTA + AUTH0 SOLUTION */}
        <div className="rounded-2xl border border-green-500/30 bg-green-900/10 overflow-hidden">
          <button
            onClick={() => toggleSection('section3')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-green-400">The Okta + Auth0 Solution</h2>
              <p className="text-slate-400 text-sm mt-1">Identity-first AI agent security architecture.</p>
            </div>
            <svg
              className={`w-6 h-6 text-slate-400 transition-transform ${expandedSections.has('section3') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.has('section3') && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-900/30 rounded-xl p-5 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">O</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Okta XAA</h3>
                      <p className="text-xs text-blue-300">Cross-App Access</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <strong>ID-JAG:</strong> Identity Assertion Grant - user context flows with agent</li>
                    <li>• <strong>Managed Connections:</strong> Centralized agent-to-service authorization</li>
                    <li>• <strong>Scoped Tokens:</strong> Least-privilege access per tool call</li>
                  </ul>
                </div>
                
                <div className="bg-purple-900/30 rounded-xl p-5 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">A</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Auth0 Token Vault</h3>
                      <p className="text-xs text-purple-300">Secure Token Storage</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <strong>Connected Accounts:</strong> User-linked third-party tokens</li>
                    <li>• <strong>Automatic Refresh:</strong> Token lifecycle management</li>
                    <li>• <strong>Federated Access:</strong> Google, Salesforce, GitHub, etc.</li>
                  </ul>
                </div>
              </div>

              {/* Flow Diagram */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
                <h4 className="text-sm font-semibold text-white mb-4">Token Flow Architecture</h4>
                <div className="flex items-center justify-between text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-lg">👤</span>
                    </div>
                    <span className="text-xs text-slate-400">User</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-white">O</span>
                    </div>
                    <span className="text-xs text-slate-400">Okta XAA</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-lg">🤖</span>
                    </div>
                    <span className="text-xs text-slate-400">AI Agent</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-white">A</span>
                    </div>
                    <span className="text-xs text-slate-400">Token Vault</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-lg">📅</span>
                    </div>
                    <span className="text-xs text-slate-400">Google/SF</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-green-400 mb-2">💬 Talk Track</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  "Here's how Okta and Auth0 work together. When a user asks the AI agent to check their calendar, Okta's XAA ensures 
                  the agent acts with the user's identity - not a service account. The ID-JAG token carries user context through every hop. 
                  Then Auth0's Token Vault securely retrieves the user's Google Calendar token without the agent ever seeing raw credentials. 
                  Every action is attributable, auditable, and automatically scoped."
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: LIVE DEMO */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-900/10 overflow-hidden">
          <button
            onClick={() => toggleSection('section4')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-amber-400">Live Demo: Apex Wealth Advisor</h2>
              <p className="text-slate-400 text-sm mt-1">See the token flow in action.</p>
            </div>
            <svg
              className={`w-6 h-6 text-slate-400 transition-transform ${expandedSections.has('section4') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.has('section4') && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3">Demo Prompts - Internal MCP</h4>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"Show me Marcus Thompson's portfolio"</li>
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"What's the risk profile for client portfolios?"</li>
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"List all high-value transactions today"</li>
                  </ul>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">Demo Prompts - Token Vault</h4>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"What meetings do I have this week?"</li>
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"Schedule a call with Marcus Thompson tomorrow at 3pm"</li>
                    <li className="p-2 bg-slate-900 rounded font-mono text-xs">"Find my meetings with Elena Rodriguez"</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">💬 Demo Flow</h4>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Show <strong>Agent tab</strong> - Ask "What meetings do I have this week?"</li>
                  <li>Switch to <strong>Security Flow tab</strong> - Show decoded tokens at each step</li>
                  <li>Highlight the <strong>Audit Trail</strong> - Every token exchange is logged</li>
                  <li>Point out: User identity (sub claim) flows through the entire chain</li>
                  <li>Return to Agent - Create a meeting to show write access</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: KEY TAKEAWAYS */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-900/10 overflow-hidden">
          <button
            onClick={() => toggleSection('section5')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-blue-400">Key Takeaways</h2>
              <p className="text-slate-400 text-sm mt-1">What makes this architecture different.</p>
            </div>
            <svg
              className={`w-6 h-6 text-slate-400 transition-transform ${expandedSections.has('section5') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.has('section5') && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-xl p-5 border border-green-500/30">
                  <div className="text-3xl mb-3">✅</div>
                  <h3 className="text-lg font-bold text-white mb-2">User Context Preserved</h3>
                  <p className="text-sm text-slate-400">Agent acts on behalf of user, not as a service account. Every action is attributable.</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-green-500/30">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-lg font-bold text-white mb-2">Zero Credential Exposure</h3>
                  <p className="text-sm text-slate-400">Tokens are exchanged, never stored in agent code. Token Vault handles refresh automatically.</p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-green-500/30">
                  <div className="text-3xl mb-3">📋</div>
                  <h3 className="text-lg font-bold text-white mb-2">Complete Audit Trail</h3>
                  <p className="text-sm text-slate-400">Every token exchange is logged. Compliance teams can trace any agent action back to user intent.</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
