'use client';

import { useState, useEffect } from 'react';

interface ArchitectureFlowProps {
  isAuthenticated: boolean;
  userName?: string;
  toolsCalled?: string[];
  lastAction?: string;
}

export default function ArchitectureFlowVisual({ 
  isAuthenticated, 
  userName = 'Advisor',
  toolsCalled = [],
  lastAction
}: ArchitectureFlowProps) {
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [animatingPath, setAnimatingPath] = useState<string | null>(null);

  // Determine active connections based on tools called
  const hasMcpCall = toolsCalled.some(t => 
    ['get_client', 'list_clients', 'get_portfolio', 'process_payment', 'update_client'].includes(t)
  );
  const hasSalesforceCall = toolsCalled.some(t => 
    t.toLowerCase().includes('salesforce') || t.toLowerCase().includes('contact') || t.toLowerCase().includes('opportunity')
  );
  const hasGoogleCall = toolsCalled.some(t => 
    t.toLowerCase().includes('calendar') || t.toLowerCase().includes('google') || t.toLowerCase().includes('schedule')
  );
  const hasBigQueryCall = toolsCalled.some(t => 
    t.toLowerCase().includes('bigquery') || t.toLowerCase().includes('analytics') || t.toLowerCase().includes('query')
  );

  // Animate path when tools are called
  useEffect(() => {
    if (hasMcpCall) {
      setAnimatingPath('mcp');
      setTimeout(() => setAnimatingPath(null), 2000);
    }
  }, [toolsCalled]);

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-white">AI Agent Security Architecture</h3>
        </div>
        <span className="text-xs text-slate-500">Live Flow Visualization</span>
      </div>

      {/* Main Architecture Diagram */}
      <div className="relative">
        {/* SVG for connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* User to Okta */}
          <line x1="50%" y1="45" x2="50%" y2="85" 
            className={`stroke-2 ${isAuthenticated ? 'stroke-green-500' : 'stroke-slate-600'}`}
            strokeDasharray={isAuthenticated ? "0" : "4"}
          />
          
          {/* Okta to Agent */}
          <line x1="50%" y1="125" x2="50%" y2="165" 
            className={`stroke-2 ${isAuthenticated ? 'stroke-blue-500' : 'stroke-slate-600'}`}
          />
          
          {/* Agent to Internal MCP */}
          <path d="M 25% 210 Q 15% 240, 15% 270" 
            fill="none"
            className={`stroke-2 transition-all duration-500 ${hasMcpCall ? 'stroke-purple-500' : 'stroke-slate-600'}`}
            strokeDasharray={hasMcpCall ? "0" : "4"}
          />
          
          {/* Agent to External SaaS */}
          <line x1="50%" y1="210" x2="50%" y2="270" 
            fill="none"
            className={`stroke-2 transition-all duration-500 ${(hasSalesforceCall || hasGoogleCall) ? 'stroke-cyan-500' : 'stroke-slate-600'}`}
            strokeDasharray={(hasSalesforceCall || hasGoogleCall) ? "0" : "4"}
          />
          
          {/* Agent to External MCP */}
          <path d="M 75% 210 Q 85% 240, 85% 270" 
            fill="none"
            className={`stroke-2 transition-all duration-500 ${hasBigQueryCall ? 'stroke-emerald-500' : 'stroke-slate-600'}`}
            strokeDasharray={hasBigQueryCall ? "0" : "4"}
          />
        </svg>

        {/* Layer 1: User */}
        <div className="flex justify-center mb-2 relative z-10">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all ${
            isAuthenticated 
              ? 'bg-green-900/40 border-green-500 shadow-lg shadow-green-500/20' 
              : 'bg-slate-800 border-slate-600'
          }`}>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">👤</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{userName}</p>
              <p className={`text-xs ${isAuthenticated ? 'text-green-400' : 'text-slate-500'}`}>
                {isAuthenticated ? '✓ Logged In' : '○ Not Authenticated'}
              </p>
            </div>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex justify-center my-1 relative z-10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isAuthenticated ? 'bg-green-500/20' : 'bg-slate-700'
          }`}>
            <span className="text-xs">{isAuthenticated ? '🔓' : '🔒'}</span>
          </div>
        </div>

        {/* Layer 2: Identity Provider (Okta) */}
        <div className="flex justify-center mb-2 relative z-10">
          <div className={`px-6 py-3 rounded-xl border-2 transition-all ${
            isAuthenticated 
              ? 'bg-blue-900/40 border-blue-500 shadow-lg shadow-blue-500/20' 
              : 'bg-slate-800 border-slate-600'
          }`}>
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <span className="font-bold text-blue-300 text-sm">OKTA</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              <span className="text-xs bg-blue-800/60 px-2 py-0.5 rounded text-blue-200">SSO</span>
              <span className="text-xs bg-blue-800/60 px-2 py-0.5 rounded text-blue-200">XAA</span>
              <span className="text-xs bg-blue-800/60 px-2 py-0.5 rounded text-blue-200">ID-JAG</span>
            </div>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex justify-center my-1 relative z-10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isAuthenticated ? 'bg-blue-500/20' : 'bg-slate-700'
          }`}>
            <span className="text-xs">🔑</span>
          </div>
        </div>

        {/* Layer 3: AI Agent */}
        <div className="flex justify-center mb-3 relative z-10">
          <div className={`px-8 py-4 rounded-xl border-2 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500 shadow-lg shadow-amber-500/20`}>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">🤖</span>
              <div>
                <span className="font-bold text-amber-300 text-sm">Buffett AI Agent</span>
                <p className="text-xs text-amber-400/70">Claude + Tool Orchestration</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              <span className="text-xs bg-amber-800/60 px-2 py-0.5 rounded text-amber-200">FGA</span>
              <span className="text-xs bg-red-800/60 px-2 py-0.5 rounded text-red-200">CIBA</span>
              <span className="text-xs bg-amber-800/60 px-2 py-0.5 rounded text-amber-200">MCP</span>
            </div>
          </div>
        </div>

        {/* Layer 4: Data Sources (3 columns) */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {/* Internal MCP Server */}
          <div 
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              hasMcpCall 
                ? 'bg-purple-900/40 border-purple-500 shadow-lg shadow-purple-500/30 scale-105' 
                : 'bg-slate-800/50 border-slate-600 hover:border-purple-500/50'
            }`}
            onMouseEnter={() => setActiveConnection('mcp')}
            onMouseLeave={() => setActiveConnection(null)}
          >
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-600/30 rounded-lg flex items-center justify-center">
                <span className="text-xl">🏢</span>
              </div>
              <p className="text-xs font-bold text-white">Internal MCP</p>
              <p className="text-xs text-slate-400 mb-2">Portfolio Server</p>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs">O</span>
                  </div>
                  <span className="text-xs text-blue-300">Okta XAA</span>
                </div>
              </div>
              {hasMcpCall && (
                <div className="mt-2">
                  <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full animate-pulse">
                    ● ACTIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* External SaaS APIs */}
          <div 
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              (hasSalesforceCall || hasGoogleCall)
                ? 'bg-cyan-900/40 border-cyan-500 shadow-lg shadow-cyan-500/30 scale-105' 
                : 'bg-slate-800/50 border-slate-600 hover:border-cyan-500/50'
            }`}
            onMouseEnter={() => setActiveConnection('saas')}
            onMouseLeave={() => setActiveConnection(null)}
          >
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-cyan-600/30 rounded-lg flex items-center justify-center">
                <span className="text-xl">☁️</span>
              </div>
              <p className="text-xs font-bold text-white">External SaaS</p>
              <p className="text-xs text-slate-400 mb-2">Salesforce • Google</p>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-4 h-4 bg-orange-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs">A</span>
                  </div>
                  <span className="text-xs text-orange-300">Auth0 Vault</span>
                </div>
              </div>
              {(hasSalesforceCall || hasGoogleCall) && (
                <div className="mt-2">
                  <span className="text-xs bg-cyan-500 text-white px-2 py-1 rounded-full animate-pulse">
                    ● ACTIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* External MCP Server */}
          <div 
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              hasBigQueryCall 
                ? 'bg-emerald-900/40 border-emerald-500 shadow-lg shadow-emerald-500/30 scale-105' 
                : 'bg-slate-800/50 border-slate-600 hover:border-emerald-500/50'
            }`}
            onMouseEnter={() => setActiveConnection('bigquery')}
            onMouseLeave={() => setActiveConnection(null)}
          >
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-emerald-600/30 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <p className="text-xs font-bold text-white">External MCP</p>
              <p className="text-xs text-slate-400 mb-2">BigQuery Analytics</p>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-4 h-4 bg-orange-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs">A</span>
                  </div>
                  <span className="text-xs text-orange-300">Auth0 Vault</span>
                </div>
              </div>
              {hasBigQueryCall && (
                <div className="mt-2">
                  <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full animate-pulse">
                    ● ACTIVE
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Controls Legend */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs text-slate-400">Okta SSO/XAA</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-xs text-slate-400">Auth0 Token Vault</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span className="text-xs text-slate-400">FGA Policy</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-xs text-slate-400">CIBA Step-Up</span>
            </div>
          </div>
        </div>

        {/* Active Flow Status */}
        {toolsCalled.length > 0 && (
          <div className="mt-3 bg-slate-900/50 rounded-lg p-2 border border-slate-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-300">
                Last tool call: <span className="text-amber-400 font-mono">{toolsCalled[toolsCalled.length - 1]}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
