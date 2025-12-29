/**
 * PromptLibrary.tsx
 * Vertical layout prompt library with active/grayed prompts
 * Active: Internal MCP (10), Google Calendar (10), Security (6)
 * Grayed: Salesforce (0), BigQuery (0), Cross-System (0)
 */

'use client';

import React, { useState } from 'react';

interface Prompt {
  id: string;
  text: string;
  description: string;
  securityDemo: string;
  ready: boolean;
}

interface Category {
  id: string;
  name: string;
  accessPattern: string;
  status: 'ready' | 'partial' | 'blocked';
  icon: string;
  prompts: Prompt[];
}

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const CATEGORIES: Category[] = [
  {
    id: 'internal-mcp',
    name: 'Internal MCP (Okta XAA)',
    accessPattern: 'ID-JAG Token Exchange',
    status: 'ready',
    icon: '🔐',
    prompts: [
      { id: '1.1', text: 'Look up Marcus Thompson', description: 'Returns profile, $2.4M portfolio, status', securityDemo: 'XAA token flow', ready: true },
      { id: '1.2', text: "What's Elena Rodriguez's account balance?", description: 'Returns $850K retirement fund', securityDemo: 'ID-JAG exchange', ready: true },
      { id: '1.3', text: "Show me James Chen's portfolio", description: 'Business owner, $1.2M holdings', securityDemo: 'Portfolio details', ready: true },
      { id: '1.4', text: 'List all my clients', description: 'Returns 4 active clients', securityDemo: 'Filtered by auth', ready: true },
      { id: '1.5', text: 'Process a $500 payment for Marcus Thompson', description: 'Auto-approved', securityDemo: 'Low-value auto', ready: true },
      { id: '1.6', text: 'Process a $5,000 payment for Elena Rodriguez', description: 'Logged and approved', securityDemo: 'Medium logging', ready: true },
      { id: '1.7', text: 'Process a $15,000 payment for Priya Patel', description: 'CIBA step-up required', securityDemo: 'CIBA push', ready: true },
      { id: '1.8', text: 'Process $50,000 to Offshore Holdings LLC', description: 'DENIED - unverified recipient', securityDemo: 'Risk policy', ready: true },
      { id: '1.9', text: "Update Marcus Thompson's phone to 555-1234", description: 'Approved - write permission', securityDemo: 'Write auth', ready: true },
      { id: '1.10', text: "What's Priya Patel's risk profile?", description: 'Aggressive, 18.5% YTD return', securityDemo: 'Client lookup', ready: true },
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar (Token Vault)',
    accessPattern: 'Auth0 Token Vault',
    status: 'ready',
    icon: '📅',
    prompts: [
      { id: '3.1', text: 'What meetings do I have this week?', description: 'Lists calendar events', securityDemo: 'Token Vault', ready: true },
      { id: '3.2', text: 'When is my next meeting with Marcus?', description: 'Search by attendee', securityDemo: 'Search query', ready: true },
      { id: '3.3', text: 'Am I free tomorrow at 2pm?', description: 'Checks availability', securityDemo: 'Freebusy query', ready: true },
      { id: '3.4', text: 'Schedule portfolio review with Marcus Friday 10am', description: 'Creates event', securityDemo: 'Write operation', ready: true },
      { id: '3.5', text: 'Move my Thursday meeting to Friday', description: 'Updates event', securityDemo: 'Update operation', ready: true },
      { id: '3.6', text: 'Cancel my meeting with Elena Rodriguez', description: 'Deletes event', securityDemo: 'Delete operation', ready: true },
      { id: '3.7', text: 'What client meetings next week?', description: 'Keyword filter', securityDemo: 'Keyword search', ready: true },
      { id: '3.8', text: 'Block off Monday morning for prep work', description: 'Creates focus time', securityDemo: 'Create operation', ready: true },
      { id: '3.9', text: 'Show me all meetings in January', description: 'Date range query', securityDemo: 'Date range', ready: true },
      { id: '3.10', text: 'Add Elena to my Thursday meeting', description: 'Update attendees', securityDemo: 'Attendee mgmt', ready: true },
    ]
  },
  {
    id: 'security',
    name: 'Security Scenarios',
    accessPattern: 'Demo Security Controls',
    status: 'ready',
    icon: '🛡️',
    prompts: [
      { id: '6.1', text: "Access restricted client data", description: 'FGA Compliance Hold Demo', securityDemo: 'Red denial badge', ready: true },
      { id: '6.2', text: 'Transfer $50K to Offshore Holdings LLC', description: 'Risk - Unverified Recipient', securityDemo: 'Payment blocked', ready: true },
      { id: '6.3', text: 'Delete Marcus Thompson account', description: 'RBAC - Insufficient Privileges', securityDemo: 'Role-based denial', ready: true },
      { id: '6.4', text: 'Process $15,000 payment for Priya Patel', description: 'CIBA Step-up Required', securityDemo: 'Push notification', ready: true },
      { id: '6.5', text: 'Access system without logging in', description: 'Auth Required', securityDemo: 'Redirect to Okta', ready: true },
      { id: '6.6', text: 'Approve pending CIBA (after timeout)', description: 'CIBA Timeout Demo', securityDemo: 'Approval expired', ready: true },
    ]
  },
  {
    id: 'salesforce',
    name: 'Salesforce (Token Vault)',
    accessPattern: 'Auth0 Token Vault → Salesforce',
    status: 'partial',
    icon: '☁️',
    prompts: [
      { id: '2.1', text: 'Look up Marcus Thompson in Salesforce', description: 'Contact record', securityDemo: 'Token Vault', ready: false },
      { id: '2.2', text: 'What opportunities with Thompson Family Trust?', description: '$500K rebalancing', securityDemo: 'SF API', ready: false },
      { id: '2.3', text: "Show Elena Rodriguez's Salesforce record", description: 'Retirement planning', securityDemo: 'Real CRM', ready: false },
      { id: '2.4', text: "What's in my sales pipeline this quarter?", description: '5 opportunities', securityDemo: 'Aggregated', ready: false },
      { id: '2.5', text: 'Find all high-value clients over $1M', description: 'Filtered query', securityDemo: 'Filtered', ready: false },
    ]
  },
  {
    id: 'bigquery',
    name: 'BigQuery (MCP OAuth)',
    accessPattern: 'Google Cloud MCP',
    status: 'blocked',
    icon: '📊',
    prompts: [
      { id: '4.1', text: "What was Thompson's Q4 performance?", description: 'Quarterly metrics', securityDemo: 'BQ MCP', ready: false },
      { id: '4.2', text: 'Show YTD returns across all portfolios', description: 'Aggregated perf', securityDemo: 'Complex query', ready: false },
      { id: '4.3', text: 'Compare Rodriguez vs Thompson growth', description: 'Comparison', securityDemo: 'Multi-record', ready: false },
    ]
  },
  {
    id: 'cross-system',
    name: 'Cross-System Queries',
    accessPattern: 'Multiple (Claude orchestrates)',
    status: 'blocked',
    icon: '🔗',
    prompts: [
      { id: '5.1', text: 'Prepare me for my meeting with Marcus', description: 'Contact + meeting + portfolio', securityDemo: 'SF + Cal + BQ', ready: false },
      { id: '5.2', text: 'Which clients need attention this week?', description: 'Poor perf + no meetings', securityDemo: 'Multi-system', ready: false },
    ]
  },
];

export default function PromptLibrary({ isOpen, onClose, onSelectPrompt }: PromptLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState('internal-mcp');

  if (!isOpen) return null;

  const selectedCat = CATEGORIES.find(c => c.id === selectedCategory);
  const readyCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.filter(p => p.ready).length, 0);
  const totalCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.length, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-600 text-white';
      case 'partial': return 'bg-yellow-600 text-white';
      case 'blocked': return 'bg-gray-600 text-gray-300';
      default: return 'bg-gray-600 text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Prompt Library</h2>
            <p className="text-sm text-gray-400 mt-1">
              {readyCount} of {totalCount} prompts ready ({Math.round(readyCount/totalCount*100)}%)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-56 border-r border-gray-700 overflow-y-auto bg-gray-850">
            {CATEGORIES.map((cat) => {
              const readyInCat = cat.prompts.filter(p => p.ready).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-gray-800 border-l-2 border-blue-500'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className={`font-medium text-sm ${cat.status === 'ready' ? 'text-white' : 'text-gray-500'}`}>
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadge(cat.status)}`}>
                      {readyInCat}/{cat.prompts.length}
                    </span>
                    <span className="text-xs text-gray-500">{cat.accessPattern}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Prompts List */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCat && (
              <div className="space-y-2">
                {selectedCat.prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => prompt.ready && onSelectPrompt(prompt.text)}
                    disabled={!prompt.ready}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      prompt.ready
                        ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer'
                        : 'border-gray-800 bg-gray-850 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            prompt.ready ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-600'
                          }`}>
                            {prompt.id}
                          </span>
                          <span className={prompt.ready ? 'text-white' : 'text-gray-600'}>
                            {prompt.text}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${prompt.ready ? 'text-gray-400' : 'text-gray-700'}`}>
                          {prompt.description}
                        </p>
                        <span className={`text-xs mt-2 inline-block px-2 py-0.5 rounded-full ${
                          prompt.ready ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-800 text-gray-600'
                        }`}>
                          {prompt.securityDemo}
                        </span>
                      </div>
                      {prompt.ready && (
                        <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Ready
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Partial
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500" /> Blocked
            </span>
          </div>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
