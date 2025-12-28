'use client';

import { useState } from 'react';

interface XAAFlowInfo {
  id_jag_token?: string;
  mcp_access_token?: string;
  expires_in?: number;
  scope?: string;
  exchanged_at?: string;
}

interface XAAFlowCardProps {
  xaaInfo: XAAFlowInfo | null;
  toolsCalled?: string[];
}

export default function XAAFlowCard({ xaaInfo, toolsCalled }: XAAFlowCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Determine which steps are complete
  const hasIdJag = !!xaaInfo?.id_jag_token;
  const hasMcpToken = !!xaaInfo?.mcp_access_token;
  const hasToolsExecuted = toolsCalled && toolsCalled.length > 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 ${hasMcpToken ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
          <span className="font-medium text-white">XAA Token Flow</span>
          {hasMcpToken && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* ID-JAG Flow Visualization */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Cross-App Access Flow</h4>
            <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-green-900/30 rounded-lg p-4 border border-slate-600">
              <div className="space-y-3">
                {/* Backend Section */}
                <div className="mb-3 pb-2 border-b border-slate-600">
                  <p className="text-xs font-semibold text-amber-400">🔐 Backend API (Steps 1-3)</p>
                </div>

                {/* Step 1: Exchange ID Token */}
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 ${hasIdJag ? 'bg-blue-500' : 'bg-slate-600'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-200">ID Token → ID-JAG</p>
                    <p className="text-xs text-slate-400">Exchange user ID token for ID-JAG token</p>
                  </div>
                  {hasIdJag && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8"></div>
                  <div className={`flex-1 border-l-2 ${hasIdJag ? 'border-blue-400' : 'border-slate-600'} border-dashed h-4 ml-4`}></div>
                </div>

                {/* Step 2: Verify ID-JAG */}
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 ${hasIdJag ? 'bg-purple-500' : 'bg-slate-600'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-200">Verify ID-JAG</p>
                    <p className="text-xs text-slate-400">Validate ID-JAG token (audit trail)</p>
                  </div>
                  {hasIdJag && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8"></div>
                  <div className={`flex-1 border-l-2 ${hasMcpToken ? 'border-purple-400' : 'border-slate-600'} border-dashed h-4 ml-4`}></div>
                </div>

                {/* Step 3: Exchange for MCP Token */}
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 ${hasMcpToken ? 'bg-indigo-500' : 'bg-slate-600'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-200">ID-JAG → MCP Token</p>
                    <p className="text-xs text-slate-400">Exchange for auth server token</p>
                  </div>
                  {hasMcpToken && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* MCP Server Section */}
                <div className="mt-4 pt-3 border-t border-slate-600">
                  <p className="text-xs font-semibold text-green-400 mb-3">🖥️ MCP Server (Step 4)</p>
                </div>

                {/* Step 4: Validate Token & Execute */}
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 ${hasToolsExecuted ? 'bg-green-500' : 'bg-slate-600'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-200">Validate & Execute</p>
                    <p className="text-xs text-slate-400">
                      {hasToolsExecuted
                        ? `Verified. Tools: ${toolsCalled?.join(', ')}`
                        : 'Verify MCP token before tool execution'}
                    </p>
                  </div>
                  {hasToolsExecuted && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ID-JAG Token Display */}
          {xaaInfo?.id_jag_token && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-300">ID-JAG Token</h4>
                <button
                  onClick={() => copyToClipboard(xaaInfo.id_jag_token || '', 'id_jag')}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded hover:bg-blue-800/50 transition-colors"
                >
                  {copiedField === 'id_jag' ? (
                    <span className="text-green-400">Copied!</span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              </div>
              <div className="bg-blue-900/30 rounded-md p-3 border border-blue-700/50 font-mono text-xs break-all">
                <p className="text-blue-300">
                  {xaaInfo.id_jag_token.substring(0, 60)}...
                </p>
              </div>
            </div>
          )}

          {/* MCP Access Token Display */}
          {xaaInfo?.mcp_access_token && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-slate-300">MCP Access Token</h4>
                  <div className="flex space-x-3 mt-1">
                    {xaaInfo.scope && (
                      <p className="text-xs text-slate-400">Scope: <span className="text-amber-400">{xaaInfo.scope}</span></p>
                    )}
                    {xaaInfo.expires_in && (
                      <p className="text-xs text-slate-400">Expires: <span className="text-amber-400">{xaaInfo.expires_in}s</span></p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(xaaInfo.mcp_access_token || '', 'mcp_token')}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-900/50 text-green-300 rounded hover:bg-green-800/50 transition-colors"
                >
                  {copiedField === 'mcp_token' ? (
                    <span className="text-green-400">Copied!</span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              </div>
              <div className="bg-green-900/30 rounded-md p-3 border border-green-700/50 font-mono text-xs break-all">
                <p className="text-green-300">
                  {xaaInfo.mcp_access_token.substring(0, 60)}...
                </p>
              </div>
            </div>
          )}

          {/* Security Badge */}
          <div className="bg-green-900/30 rounded-md p-3 border border-green-700/50 flex items-start space-x-2">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-300">Okta Cross-App Access</p>
              <p className="text-xs text-green-400/70">ID tokens never exposed to MCP. Short-lived scoped tokens only.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
