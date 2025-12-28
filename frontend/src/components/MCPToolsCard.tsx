'use client';

import { useState } from 'react';

interface MCPToolsCardProps {
  toolsCalled?: string[];
  mcpServer?: string;
}

export default function MCPToolsCard({ toolsCalled, mcpServer = 'apex-wealth-mcp' }: MCPToolsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getToolIcon = (tool: string) => {
    if (tool.includes('client') || tool.includes('list')) {
      return '👤';
    }
    if (tool.includes('portfolio')) {
      return '📊';
    }
    if (tool.includes('payment') || tool.includes('transaction')) {
      return '💳';
    }
    if (tool.includes('update')) {
      return '✏️';
    }
    return '🔧';
  };

  const getToolDescription = (tool: string) => {
    switch (tool) {
      case 'get_client':
        return 'Retrieves client information from internal systems';
      case 'list_clients':
        return 'Lists all clients with portfolio summary';
      case 'get_portfolio':
        return 'Gets detailed portfolio holdings and performance';
      case 'process_payment':
        return 'Processes payment with security checks';
      case 'update_client':
        return 'Updates client contact information';
      default:
        return 'MCP tool execution';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="font-medium text-white">MCP Tools</span>
          {toolsCalled && toolsCalled.length > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {toolsCalled.length} called
            </span>
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
        <div className="px-4 pb-4 space-y-3">
          {/* MCP Server Info */}
          <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-700/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{mcpServer}</p>
                <p className="text-xs text-purple-300">Wealth Management MCP Server</p>
              </div>
            </div>
          </div>

          {/* Tools Called */}
          {toolsCalled && toolsCalled.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Tools Executed</h4>
              {toolsCalled.map((tool, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getToolIcon(tool)}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{tool}</p>
                      <p className="text-xs text-slate-400">{getToolDescription(tool)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <p className="text-sm text-slate-400 text-center">No tools executed yet</p>
              <p className="text-xs text-slate-500 text-center mt-1">Ask about clients to trigger MCP calls</p>
            </div>
          )}

          {/* Available Tools */}
          <div className="mt-3 pt-3 border-t border-slate-600">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Available Tools</h4>
            <div className="flex flex-wrap gap-1">
              {['get_client', 'list_clients', 'get_portfolio', 'process_payment', 'update_client'].map((tool) => (
                <span
                  key={tool}
                  className={`text-xs px-2 py-1 rounded ${
                    toolsCalled?.includes(tool)
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
