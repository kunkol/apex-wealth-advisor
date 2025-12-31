/**
 * PromptLibrary.tsx
 * Updated with Salesforce prompts ENABLED (was grayed out)
 * 
 * Changes:
 * - Salesforce prompts now have ready: true
 * - Added salesforce access pattern
 * - 36 prompts now active (was 26)
 */

'use client';

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

interface Prompt {
  id: string;
  text: string;
  description: string;
  securityDemo: string;
  accessPattern: 'xaa' | 'token-vault-calendar' | 'token-vault-salesforce' | 'bigquery' | 'cross-system' | 'security';
  ready: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  accessPattern: string;
  status: 'ready' | 'partial' | 'blocked';
  prompts: Prompt[];
}

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Prompt Data - Salesforce NOW ENABLED
// =============================================================================

const CATEGORIES: Category[] = [
  {
    id: 'internal-mcp',
    name: '1. Internal MCP (XAA)',
    icon: <span className="text-green-400">🔐</span>,
    accessPattern: 'Okta XAA → ID-JAG → MCP Token',
    status: 'ready',
    prompts: [
      { id: '1.1', text: 'Show me all active clients', description: 'List clients from portfolio system', securityDemo: 'XAA token exchange', accessPattern: 'xaa', ready: true },
      { id: '1.2', text: 'Look up Marcus Thompson', description: 'Get client by name', securityDemo: 'MCP tool call', accessPattern: 'xaa', ready: true },
      { id: '1.3', text: 'What is Marcus Thompson\'s portfolio value?', description: 'Portfolio lookup', securityDemo: 'Scoped access', accessPattern: 'xaa', ready: true },
      { id: '1.4', text: 'Show portfolio holdings for Elena Rodriguez', description: 'Detailed holdings', securityDemo: 'User-scoped data', accessPattern: 'xaa', ready: true },
      { id: '1.5', text: 'Process a $5,000 payment to Marcus Thompson', description: 'Standard payment', securityDemo: 'Within threshold', accessPattern: 'xaa', ready: true },
      { id: '1.6', text: 'Process a $15,000 payment to Marcus Thompson', description: 'Large payment', securityDemo: 'CIBA step-up auth', accessPattern: 'xaa', ready: true },
      { id: '1.7', text: 'Update contact info for James Chen', description: 'Client update', securityDemo: 'Write operation', accessPattern: 'xaa', ready: true },
      { id: '1.8', text: 'Who are my highest value clients?', description: 'Aggregation query', securityDemo: 'Read-only access', accessPattern: 'xaa', ready: true },
      { id: '1.9', text: 'Show me clients with portfolios over $1M', description: 'Filtered query', securityDemo: 'Parameterized access', accessPattern: 'xaa', ready: true },
      { id: '1.10', text: 'Get Priya Patel\'s account summary', description: 'Full account view', securityDemo: 'Multi-tool call', accessPattern: 'xaa', ready: true },
    ]
  },
  {
    id: 'salesforce',
    name: '2. Salesforce CRM (Token Vault)',
    icon: <span className="text-sky-400">☁️</span>,
    accessPattern: 'Auth0 Token Vault → Salesforce API',
    status: 'ready',  // ← CHANGED from 'blocked' to 'ready'
    prompts: [
      { id: '2.1', text: 'Look up Marcus Thompson in Salesforce', description: 'Search contacts', securityDemo: 'Token Vault exchange', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.2', text: 'What opportunities do we have with Thompson?', description: 'Contact opportunities', securityDemo: 'Federated token', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.3', text: 'Show me Elena Rodriguez\'s Salesforce record', description: 'Contact lookup', securityDemo: 'User-delegated access', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.4', text: 'Show me the current sales pipeline', description: 'Pipeline summary', securityDemo: 'Aggregate query', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.5', text: 'Which clients have opportunities over $500K?', description: 'High-value filter', securityDemo: 'SOQL query', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.6', text: 'Create a follow-up task for Thompson next week', description: 'Create task', securityDemo: 'Write via Token Vault', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.7', text: 'Add a note to Chen\'s account about Q2 strategy', description: 'Create note', securityDemo: 'Write operation', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.8', text: 'What\'s the total pipeline value?', description: 'Pipeline aggregation', securityDemo: 'Read aggregation', accessPattern: 'token-vault-salesforce', ready: false },
      { id: '2.9', text: 'Show contacts at Grand Hotels', description: 'Account contacts', securityDemo: 'Related records', accessPattern: 'token-vault-salesforce', ready: true },
      { id: '2.10', text: 'Update Rodriguez opportunity to Negotiation stage', description: 'Update opportunity', securityDemo: 'Write via Token Vault', accessPattern: 'token-vault-salesforce', ready: true },
    ]
  },
  {
    id: 'google-calendar',
    name: '3. Google Calendar (Token Vault)',
    icon: <span className="text-rose-400">📅</span>,
    accessPattern: 'Auth0 Token Vault → Google Calendar API',
    status: 'ready',
    prompts: [
      { id: '3.1', text: 'What meetings do I have this week?', description: 'List upcoming events', securityDemo: 'Token Vault exchange', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.2', text: 'Show my calendar for tomorrow', description: 'Day view', securityDemo: 'Federated token', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.3', text: 'Do I have any meetings with Marcus Thompson?', description: 'Search by attendee', securityDemo: 'User-delegated access', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.4', text: 'Am I free at 2pm tomorrow?', description: 'Check availability', securityDemo: 'Free/busy lookup', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.5', text: 'Schedule a portfolio review with Marcus Thompson for next Tuesday at 10am', description: 'Create event', securityDemo: 'Write via Token Vault', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.6', text: 'When is my next meeting with Elena?', description: 'Search future events', securityDemo: 'Query with filter', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.7', text: 'Block off Friday afternoon for planning', description: 'Create block', securityDemo: 'Write operation', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.8', text: 'Show me all client meetings this month', description: 'Monthly view', securityDemo: 'Date range query', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.9', text: 'Cancel my meeting on Friday', description: 'Delete event', securityDemo: 'Delete via Token Vault', accessPattern: 'token-vault-calendar', ready: true },
      { id: '3.10', text: 'Find a 30-minute slot to meet with James Chen this week', description: 'Find availability', securityDemo: 'Complex availability', accessPattern: 'token-vault-calendar', ready: true },
    ]
  },
  {
    id: 'bigquery',
    name: '4. BigQuery Analytics (MCP OAuth)',
    icon: <span className="text-yellow-400">📊</span>,
    accessPattern: 'Google MCP OAuth → BigQuery',
    status: 'blocked',
    prompts: [
      { id: '4.1', text: 'Show portfolio performance YTD', description: 'Performance analytics', securityDemo: 'BigQuery via MCP', accessPattern: 'bigquery', ready: false },
      { id: '4.2', text: 'Compare returns across asset classes', description: 'Asset comparison', securityDemo: 'Analytics query', accessPattern: 'bigquery', ready: false },
      { id: '4.3', text: 'Which sectors are underperforming?', description: 'Sector analysis', securityDemo: 'Aggregated data', accessPattern: 'bigquery', ready: false },
      { id: '4.4', text: 'Show me the top 10 holdings by value', description: 'Top holdings', securityDemo: 'Ranked query', accessPattern: 'bigquery', ready: false },
      { id: '4.5', text: 'Calculate risk-adjusted returns', description: 'Risk metrics', securityDemo: 'Complex analytics', accessPattern: 'bigquery', ready: false },
    ]
  },
  {
    id: 'cross-system',
    name: '5. Cross-System Workflows',
    icon: <span className="text-purple-400">🔄</span>,
    accessPattern: 'Multiple backends orchestrated',
    status: 'partial',
    prompts: [
      { id: '5.1', text: 'Prepare for my meeting with Marcus Thompson', description: 'Portfolio + Calendar + Salesforce', securityDemo: 'Multi-system', accessPattern: 'cross-system', ready: true },
      { id: '5.2', text: 'Which clients need attention this quarter?', description: 'Performance + Calendar gaps', securityDemo: 'Cross-reference', accessPattern: 'cross-system', ready: false },
      { id: '5.3', text: 'Send Marcus his Q4 summary and schedule a review', description: 'Report + Calendar', securityDemo: 'Multi-write', accessPattern: 'cross-system', ready: false },
      { id: '5.4', text: 'What should I prioritize today?', description: 'Calendar + Opportunities + Tasks', securityDemo: 'Aggregated view', accessPattern: 'cross-system', ready: true },
    ]
  },
  {
    id: 'security',
    name: '6. Security Scenarios',
    icon: <span className="text-red-400">🛡️</span>,
    accessPattern: 'Demonstrate security controls',
    status: 'ready',
    prompts: [
      { id: '6.1', text: 'Process a $15,000 payment to Marcus Thompson', description: 'Triggers CIBA step-up', securityDemo: 'CIBA approval flow', accessPattern: 'security', ready: true },
      { id: '6.2', text: 'Show Robert Williams\' account', description: 'Compliance-restricted client', securityDemo: 'FGA denial', accessPattern: 'security', ready: true },
      { id: '6.3', text: 'Transfer $50,000 to Offshore Holdings LLC', description: 'Risk policy block', securityDemo: 'Policy enforcement', accessPattern: 'security', ready: true },
      { id: '6.4', text: 'Access another advisor\'s client', description: 'Cross-tenant attempt', securityDemo: 'Tenant isolation', accessPattern: 'security', ready: true },
      { id: '6.5', text: 'Show me all client SSNs', description: 'Sensitive data request', securityDemo: 'Data classification', accessPattern: 'security', ready: true },
      { id: '6.6', text: 'Delete Marcus Thompson\'s account', description: 'Destructive action', securityDemo: 'Write protection', accessPattern: 'security', ready: true },
    ]
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const getFlowStepIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'in_progress':
      return (
        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
        </div>
      );
  }
};

// =============================================================================
// Component
// =============================================================================

export default function PromptLibrary({
  onSelectPrompt,
  isOpen,
  onClose,
}: PromptLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('internal-mcp');

  if (!isOpen) return null;

  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);
  const readyCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.filter(p => p.ready).length, 0);
  const totalCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.length, 0);

  const handlePromptClick = (prompt: Prompt) => {
    if (!prompt.ready) return;
    onSelectPrompt(prompt.text);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📚 Prompt Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {readyCount} of {totalCount} prompts ready • Select a prompt to test the demo
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(85vh-80px)]">
          {/* Category Sidebar */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/50 overflow-y-auto">
            <div className="p-3 space-y-1">
              {CATEGORIES.map((category) => {
                const readyPrompts = category.prompts.filter(p => p.ready).length;
                const isSelected = selectedCategory === category.id;
                const isBlocked = category.status === 'blocked';
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-slate-800 border border-slate-700' 
                        : 'hover:bg-slate-800/50'
                    } ${isBlocked ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isBlocked ? 'text-slate-500' : 'text-white'}`}>
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${readyPrompts > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                            {readyPrompts}/{category.prompts.length} ready
                          </span>
                          {category.status === 'blocked' && (
                            <span className="text-xs text-amber-400">Coming soon</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompts List */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCategoryData && (
              <div className="space-y-2">
                {/* Category Header */}
                <div className="mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span>Access Pattern:</span>
                    <code className="px-2 py-1 bg-slate-800 rounded text-xs text-purple-400">
                      {selectedCategoryData.accessPattern}
                    </code>
                  </div>
                </div>

                {/* Prompt Items */}
                {selectedCategoryData.prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={!prompt.ready}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      prompt.ready
                        ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
                        : 'bg-slate-900/30 border-slate-800/50 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            prompt.ready ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {prompt.id}
                          </span>
                          <span className={`text-sm font-medium ${prompt.ready ? 'text-white' : 'text-slate-500'}`}>
                            {prompt.text}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${prompt.ready ? 'text-slate-400' : 'text-slate-600'}`}>
                          {prompt.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            prompt.ready 
                              ? prompt.accessPattern === 'token-vault-salesforce'
                                ? 'bg-sky-500/20 text-sky-400'
                                : prompt.accessPattern === 'token-vault-calendar'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-purple-500/20 text-purple-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {prompt.securityDemo}
                          </span>
                        </div>
                      </div>
                      {prompt.ready && (
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
