'use client';

import { useState } from 'react';

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const promptCategories = [
  {
    id: 'client-lookup',
    name: 'Client Lookup',
    icon: '👤',
    color: 'blue',
    prompts: [
      { label: 'Marcus Thompson', prompt: 'Look up client Marcus Thompson', description: 'High Net Worth - $2.4M' },
      { label: 'Elena Rodriguez', prompt: 'Show me Elena Rodriguez information', description: 'Retirement - $850K' },
      { label: 'James Chen', prompt: 'Find client James Chen', description: 'Business Owner - $1.2M' },
      { label: 'Priya Patel', prompt: 'Look up Priya Patel', description: 'Growth - $150K' },
      { label: 'List All Clients', prompt: 'List all my clients with their portfolio values', description: 'View entire book' },
    ]
  },
  {
    id: 'portfolio',
    name: 'Portfolio Analysis',
    icon: '📊',
    color: 'purple',
    prompts: [
      { label: 'Marcus Portfolio', prompt: "Show me Marcus Thompson's complete portfolio with holdings", description: 'Detailed holdings view' },
      { label: 'Elena Portfolio', prompt: "What are Elena Rodriguez's current holdings and allocation?", description: 'Retirement allocation' },
      { label: 'Risk Analysis', prompt: "What is James Chen's risk profile and score?", description: 'Risk assessment' },
      { label: 'YTD Performance', prompt: "Show me Priya Patel's year-to-date return", description: 'Performance metrics' },
    ]
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    icon: '📅',
    color: 'cyan',
    prompts: [
      { label: 'My Meetings', prompt: 'What meetings do I have this week?', description: '🔑 Auth0 Token Vault' },
      { label: 'Schedule Review', prompt: 'Schedule a portfolio review meeting with Marcus Thompson for next Tuesday at 2pm', description: '🔑 Auth0 Token Vault' },
      { label: 'Check Availability', prompt: "Am I free tomorrow at 2pm?", description: '🔑 Auth0 Token Vault' },
      { label: 'Find Client Meeting', prompt: 'When is my next meeting with Elena Rodriguez?', description: '🔑 Auth0 Token Vault' },
      { label: 'Book Consultation', prompt: 'Set up a retirement planning consultation with Elena Rodriguez for Friday morning', description: '🔑 Auth0 Token Vault' },
    ]
  },
  {
    id: 'transactions',
    name: 'Transactions',
    icon: '💳',
    color: 'green',
    prompts: [
      { label: 'Small Payment', prompt: 'Process a $500 payment for Marcus Thompson to ABC Vendor', description: 'Auto-approved' },
      { label: 'Medium Payment', prompt: 'Process a $5,000 payment for Elena Rodriguez to Tax Services Inc', description: 'Logged transaction' },
      { label: 'Large Payment (CIBA)', prompt: 'Process a $15,000 payment for Marcus Thompson to Investment Corp', description: '🔐 Triggers CIBA Step-Up' },
      { label: 'Compliance Review', prompt: 'Process a $75,000 distribution for Marcus Thompson', description: '⚠️ Requires compliance' },
    ]
  },
  {
    id: 'security-demos',
    name: 'Security Demos',
    icon: '🔒',
    color: 'red',
    prompts: [
      { label: 'Blocked Recipient', prompt: 'Transfer $5,000 from Marcus Thompson to Offshore Holdings LLC', description: '🚫 Blocked recipient list' },
      { label: 'CIBA Step-Up', prompt: 'Process a $25,000 withdrawal for James Chen', description: '🔐 Push notification required' },
      { label: 'Cross-System Query', prompt: "Show me Marcus Thompson's portfolio and schedule a review meeting", description: 'XAA + Token Vault' },
    ]
  },
  {
    id: 'updates',
    name: 'Client Updates',
    icon: '✏️',
    color: 'amber',
    prompts: [
      { label: 'Update Email', prompt: "Update Marcus Thompson's email to marcus.new@email.com", description: 'Contact update' },
      { label: 'Update Phone', prompt: "Change Elena Rodriguez's phone number to 555-9999", description: 'Contact update' },
      { label: 'Review Schedule', prompt: "When is Marcus Thompson's next portfolio review?", description: 'Check review date' },
    ]
  }
];

export default function PromptLibrary({ onSelectPrompt, isOpen, onToggle }: PromptLibraryProps) {
  const [activeCategory, setActiveCategory] = useState('client-lookup');

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; inactive: string; badge: string }> = {
      blue: { active: 'bg-blue-600 text-white', inactive: 'bg-slate-700 text-blue-400 hover:bg-blue-900/50', badge: 'bg-blue-500' },
      purple: { active: 'bg-purple-600 text-white', inactive: 'bg-slate-700 text-purple-400 hover:bg-purple-900/50', badge: 'bg-purple-500' },
      green: { active: 'bg-green-600 text-white', inactive: 'bg-slate-700 text-green-400 hover:bg-green-900/50', badge: 'bg-green-500' },
      red: { active: 'bg-red-600 text-white', inactive: 'bg-slate-700 text-red-400 hover:bg-red-900/50', badge: 'bg-red-500' },
      amber: { active: 'bg-amber-600 text-white', inactive: 'bg-slate-700 text-amber-400 hover:bg-amber-900/50', badge: 'bg-amber-500' },
      cyan: { active: 'bg-cyan-600 text-white', inactive: 'bg-slate-700 text-cyan-400 hover:bg-cyan-900/50', badge: 'bg-cyan-500' },
    };
    return isActive ? colors[color].active : colors[color].inactive;
  };

  const activePrompts = promptCategories.find(c => c.id === activeCategory);

  if (!isOpen) return null;

  return (
    <div className="bg-slate-800/90 backdrop-blur-lg rounded-2xl border border-slate-600 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📚</span>
          <h3 className="font-semibold text-white">Prompt Library</h3>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            {promptCategories.reduce((acc, c) => acc + c.prompts.length, 0)} scenarios
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex">
        {/* Category Tabs */}
        <div className="w-48 bg-slate-900/30 border-r border-slate-700 p-2 space-y-1">
          {promptCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center space-x-2 ${
                getColorClasses(category.color, activeCategory === category.id)
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Prompts List */}
        <div className="flex-1 p-3 max-h-64 overflow-y-auto">
          <div className="grid gap-2">
            {activePrompts?.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelectPrompt(prompt.prompt);
                  onToggle();
                }}
                className="text-left p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-amber-500/50 rounded-xl transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm group-hover:text-amber-400 transition-colors">
                    {prompt.label}
                  </span>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <p className="text-xs text-slate-400 mt-1">{prompt.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="bg-slate-900/50 px-4 py-2 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">Click a prompt to load it into the chat</p>
      </div>
    </div>
  );
}
