/**
 * PromptLibrary.tsx
 * Complete rewrite with:
 * - Collapsible/expandable sections
 * - Concrete dates, times, and values
 * - Explicit tool routing (Use Google Calendar to..., Use Salesforce to..., Use Apex MCP server to...)
 * - HITL transaction scenarios
 * - Combined workflows
 * - Removed BigQuery (not implemented)
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
  action?: 'CREATE' | 'CANCEL' | 'READ' | 'UPDATE' | 'CLOSE';
  expected?: string;
}

interface SubSection {
  id: string;
  name: string;
  icon: string;
  info?: string;
  prompts: Prompt[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  securityFlow: string;
  color: string;
  subSections: SubSection[];
}

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Prompt Data - All prompts with concrete values
// =============================================================================

const CATEGORIES: Category[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: '📅',
    securityFlow: 'Auth0 Token Vault',
    color: 'rose',
    subSections: [
      {
        id: 'gc-view',
        name: 'View Meetings',
        icon: '📖',
        prompts: [
          { id: 'gc-1', text: 'Use Google Calendar to show me all my meetings scheduled for this week. I want to plan my availability for client calls.', description: 'List weekly events', action: 'READ' },
          { id: 'gc-2', text: 'Use Google Calendar to check what client meetings I have tomorrow. I need to prepare my talking points and review portfolios.', description: 'Daily view', action: 'READ' },
          { id: 'gc-3', text: 'Use Google Calendar to check my availability on Wednesday and Thursday afternoon PST. I need to find time for a new client onboarding.', description: 'Check availability', action: 'READ' },
        ]
      },
      {
        id: 'gc-portfolio',
        name: 'Portfolio Review Meeting',
        icon: '✏️',
        info: 'Client: Marcus Thompson | Email: marcus.thompson@email.com',
        prompts: [
          { id: 'gc-4', text: 'Use Google Calendar to schedule a portfolio review meeting with Marcus Thompson (marcus.thompson@email.com) for January 15th, 2026 at 2:00 PM PST. The meeting is to discuss Q1 investment strategy and rebalancing options.', description: 'Schedule portfolio review', action: 'CREATE' },
          { id: 'gc-5', text: 'Use Google Calendar to cancel my portfolio review meeting with Marcus Thompson scheduled for January 15th, 2026. He requested to reschedule due to a conflict.', description: 'Cancel portfolio review', action: 'CANCEL' },
        ]
      },
      {
        id: 'gc-retirement',
        name: 'Retirement Planning Session',
        icon: '✏️',
        info: 'Client: Elena Rodriguez | Email: elena.rodriguez@email.com',
        prompts: [
          { id: 'gc-6', text: 'Use Google Calendar to set up a retirement planning session with Elena Rodriguez (elena.rodriguez@email.com) for January 20th, 2026 at 10:00 AM PST. We\'ll be reviewing her 401k rollover options and tax implications.', description: 'Schedule retirement session', action: 'CREATE' },
          { id: 'gc-7', text: 'Use Google Calendar to cancel my retirement planning session with Elena Rodriguez scheduled for January 20th, 2026. She needs to postpone until next month.', description: 'Cancel retirement session', action: 'CANCEL' },
        ]
      },
      {
        id: 'gc-onboarding',
        name: 'New Client Onboarding',
        icon: '✏️',
        info: 'Client: James Chen | Email: jchen@chenindustries.com',
        prompts: [
          { id: 'gc-8', text: 'Use Google Calendar to schedule an onboarding call with James Chen (jchen@chenindustries.com) for January 22nd, 2026 at 3:00 PM PST. This is our initial meeting to discuss his investment goals and risk tolerance.', description: 'Schedule onboarding call', action: 'CREATE' },
          { id: 'gc-9', text: 'Use Google Calendar to cancel my onboarding call with James Chen scheduled for January 22nd, 2026. He\'s traveling and will reach out when back.', description: 'Cancel onboarding call', action: 'CANCEL' },
        ]
      },
    ]
  },
  {
    id: 'salesforce',
    name: 'Salesforce CRM',
    icon: '☁️',
    securityFlow: 'Auth0 Token Vault',
    color: 'sky',
    subSections: [
      {
        id: 'sf-contacts',
        name: 'Read - Contacts & Accounts',
        icon: '📖',
        prompts: [
          { id: 'sf-1', text: 'Use Salesforce to look up the contact details for Marcus Thompson. I need his phone number and email for a follow-up call about his portfolio.', description: 'Contact lookup', action: 'READ' },
          { id: 'sf-2', text: 'Use Salesforce to find enterprise accounts in the Technology sector with annual revenue over $10M. I\'m preparing for our wealth management prospecting campaign.', description: 'Account search', action: 'READ' },
          { id: 'sf-3', text: 'Use Salesforce to show me contacts I added this month. I want to ensure all new leads have been followed up.', description: 'Recent contacts', action: 'READ' },
        ]
      },
      {
        id: 'sf-pipeline',
        name: 'Read - Opportunities & Pipeline',
        icon: '📖',
        prompts: [
          { id: 'sf-4', text: 'Use Salesforce to show me all my open opportunities with expected close dates this quarter. I want to review my Q1 pipeline status for the team meeting.', description: 'Pipeline view', action: 'READ' },
          { id: 'sf-5', text: 'Use Salesforce to check the current status and next steps for the Acme Corp deal. I need to update the leadership team in our standup.', description: 'Opportunity status', action: 'READ' },
        ]
      },
      {
        id: 'sf-create',
        name: 'Create - Contacts & Opportunities',
        icon: '➕',
        prompts: [
          { id: 'sf-6', text: 'Use Salesforce to create a new contact for James Chen at Chen Industries. His email is jchen@chenindustries.com and phone is 415-555-0123. He\'s a potential high-net-worth client referral.', description: 'Create contact', action: 'CREATE' },
          { id: 'sf-7', text: 'Use Salesforce to create a new opportunity for Marcus Thompson called "Trust Fund Setup" with an expected value of $500,000 and close date of March 31st, 2026.', description: 'Create opportunity', action: 'CREATE' },
        ]
      },
      {
        id: 'sf-update',
        name: 'Update - Records',
        icon: '✏️',
        prompts: [
          { id: 'sf-8', text: 'Use Salesforce to update the Acme Corp opportunity stage to "Negotiation" and add a note that we received verbal approval yesterday. Expected close is now February 15th, 2026.', description: 'Update opportunity', action: 'UPDATE' },
          { id: 'sf-9', text: 'Use Salesforce to update Marcus Thompson\'s contact record with his new phone number 415-555-9999 and add a note that he prefers afternoon calls.', description: 'Update contact', action: 'UPDATE' },
        ]
      },
      {
        id: 'sf-close',
        name: 'Close - Opportunities',
        icon: '❌',
        prompts: [
          { id: 'sf-10', text: 'Use Salesforce to close the opportunity for Beta Corp as "Closed Lost". They decided to go with a competitor due to pricing.', description: 'Close lost', action: 'CLOSE' },
          { id: 'sf-11', text: 'Use Salesforce to mark the Acme Corp opportunity as "Closed Won" with final value of $475,000. Contract was signed today.', description: 'Close won', action: 'CLOSE' },
        ]
      },
    ]
  },
  {
    id: 'apex-mcp',
    name: 'Apex MCP (Internal)',
    icon: '🏦',
    securityFlow: 'Okta XAA (Cross-App Access)',
    color: 'green',
    subSections: [
      {
        id: 'mcp-read',
        name: 'Read - Client & Portfolio Data',
        icon: '📖',
        prompts: [
          { id: 'mcp-1', text: 'Use the Apex MCP server to show me my complete client roster with their AUM, risk profile, and last contact date. I need to prioritize outreach this week.', description: 'Client roster', action: 'READ' },
          { id: 'mcp-2', text: 'Use the Apex MCP server to pull up the full portfolio breakdown for Marcus Thompson including asset allocation, YTD performance, and benchmark comparison.', description: 'Portfolio details', action: 'READ' },
          { id: 'mcp-3', text: 'Use the Apex MCP server to show all transactions for Elena Rodriguez in the last 90 days. I\'m preparing for her quarterly review meeting.', description: 'Transaction history', action: 'READ' },
          { id: 'mcp-4', text: 'Use the Apex MCP server to get our total assets under management and average client AUM. I need these metrics for the monthly leadership report.', description: 'AUM metrics', action: 'READ' },
          { id: 'mcp-5', text: 'Use the Apex MCP server to identify high-net-worth clients with AUM over $1M who haven\'t had a portfolio review in the last 6 months.', description: 'Client filter', action: 'READ' },
        ]
      },
      {
        id: 'mcp-create',
        name: 'Create - Clients',
        icon: '➕',
        prompts: [
          { id: 'mcp-6', text: 'Use the Apex MCP server to onboard a new client James Chen with initial AUM of $750,000, moderate risk tolerance, and growth-focused investment objective.', description: 'Onboard client', action: 'CREATE' },
        ]
      },
      {
        id: 'mcp-update',
        name: 'Update - Client Profiles',
        icon: '✏️',
        prompts: [
          { id: 'mcp-7', text: 'Use the Apex MCP server to update Elena Rodriguez\'s risk profile from "Moderate" to "Conservative". She\'s approaching retirement and wants to reduce volatility.', description: 'Update risk profile', action: 'UPDATE' },
          { id: 'mcp-8', text: 'Use the Apex MCP server to rebalance Marcus Thompson\'s portfolio to 60% equities, 30% bonds, and 10% alternatives per his updated investment policy statement.', description: 'Rebalance portfolio', action: 'UPDATE' },
        ]
      },
      {
        id: 'mcp-close',
        name: 'Close - Accounts',
        icon: '❌',
        prompts: [
          { id: 'mcp-9', text: 'Use the Apex MCP server to close the account for client David Wilson. He has transferred all assets to another advisor. Archive all records per compliance requirements.', description: 'Close account', action: 'CLOSE' },
        ]
      },
    ]
  },
  {
    id: 'hitl',
    name: 'HITL Transactions',
    icon: '💸',
    securityFlow: 'Okta XAA + Human-in-the-Loop',
    color: 'amber',
    subSections: [
      {
        id: 'hitl-auto',
        name: 'Auto-Approved (Under $10,000)',
        icon: '✅',
        info: 'Threshold: < $10,000 | Approval: None | Status: Immediate',
        prompts: [
          { id: 'hitl-1', text: 'Use the Apex MCP server to process a $5,000 transfer from Marcus Thompson\'s brokerage account (****4521) to his checking account (****7890). He needs funds for a home repair.', description: 'Small transfer - auto-approved', action: 'CREATE', expected: 'Transaction completes immediately. No approval required.' },
        ]
      },
      {
        id: 'hitl-manager',
        name: 'Manager Approval ($10K - $50K)',
        icon: '⚠️',
        info: 'Threshold: $10,000 - $50,000 | Approver: Sarah Johnson (Manager)',
        prompts: [
          { id: 'hitl-2', text: 'Use the Apex MCP server to process a $25,000 transfer from Elena Rodriguez\'s IRA (****3344) to her savings account (****5566) for her daughter\'s tuition payment.', description: 'Medium transfer - manager approval', action: 'CREATE', expected: 'Transaction pending. Routed to manager Sarah Johnson for approval.' },
        ]
      },
      {
        id: 'hitl-vp',
        name: 'VP Approval ($50K - $250K)',
        icon: '⚠️',
        info: 'Threshold: $50,000 - $250,000 | Approver: Michael Roberts (VP Operations)',
        prompts: [
          { id: 'hitl-3', text: 'Use the Apex MCP server to process a $150,000 transfer from James Chen\'s trust account (****8899) to his business operating account (****2233) for a real estate investment.', description: 'Large transfer - VP approval', action: 'CREATE', expected: 'Transaction pending. Routed to VP Michael Roberts. Estimated review: 4-8 hours.' },
        ]
      },
      {
        id: 'hitl-exec',
        name: 'Executive Approval (Over $250K)',
        icon: '🛑',
        info: 'Threshold: > $250,000 | Approvers: CFO + Compliance Team',
        prompts: [
          { id: 'hitl-4', text: 'Use the Apex MCP server to process a $500,000 transfer from Marcus Thompson\'s investment account (****1122) to an external brokerage at Fidelity (****9900) for portfolio consolidation.', description: 'Very large transfer - executive approval', action: 'CREATE', expected: 'Multi-level approval chain: Manager → VP → CFO → Compliance. ETA: 1-2 business days.' },
        ]
      },
      {
        id: 'hitl-compliance',
        name: 'Compliance Flag (International)',
        icon: '🚨',
        info: 'Trigger: International wire, High-risk jurisdiction | Approver: BSA Team',
        prompts: [
          { id: 'hitl-5', text: 'Use the Apex MCP server to process a $75,000 wire transfer from Elena Rodriguez\'s account (****3344) to an international account in the Cayman Islands (IBAN: KY12345678).', description: 'International wire - compliance hold', action: 'CREATE', expected: 'Transaction held. Compliance flags: international destination, high-risk jurisdiction. Requires client verification and AML screening.' },
        ]
      },
    ]
  },
  {
    id: 'combined',
    name: 'Combined Workflows',
    icon: '🔄',
    securityFlow: 'Multiple Security Flows',
    color: 'purple',
    subSections: [
      {
        id: 'comb-review',
        name: 'Client Review Prep',
        icon: '📋',
        info: 'Flow: Okta XAA → Apex MCP, then Auth0 Token Vault → Google Calendar',
        prompts: [
          { id: 'comb-1', text: 'First, use the Apex MCP server to get Marcus Thompson\'s current portfolio value, YTD performance, and recent transactions. Then, use Google Calendar to schedule a Q1 review meeting with him (marcus.thompson@email.com) for January 25th, 2026 at 2:00 PM PST to discuss rebalancing his equity allocation.', description: 'Portfolio + Calendar', action: 'CREATE' },
        ]
      },
      {
        id: 'comb-onboard',
        name: 'New Client Onboarding',
        icon: '👤',
        info: 'Flow: Auth0 Token Vault → Salesforce, then Okta XAA → Apex MCP, then Auth0 Token Vault → Calendar',
        prompts: [
          { id: 'comb-2', text: 'Use Salesforce to create a new contact for James Chen (jchen@chenindustries.com, 415-555-0123). Then use the Apex MCP server to set up his client profile with $750,000 initial AUM and moderate risk tolerance. Finally, use Google Calendar to schedule an onboarding call with him for January 28th, 2026 at 11:00 AM PST.', description: 'Salesforce + MCP + Calendar', action: 'CREATE' },
        ]
      },
      {
        id: 'comb-followup',
        name: 'Meeting Follow-up',
        icon: '✅',
        info: 'Flow: Okta XAA → Apex MCP, then Auth0 Token Vault → Salesforce, then Auth0 Token Vault → Calendar',
        prompts: [
          { id: 'comb-3', text: 'I just finished my meeting with Elena Rodriguez. Use the Apex MCP server to update her risk profile to Conservative. Then use Salesforce to log a completed activity note summarizing our retirement timeline discussion. Finally, use Google Calendar to schedule a follow-up with her (elena.rodriguez@email.com) for February 5th, 2026 at 10:00 AM PST.', description: 'MCP + Salesforce + Calendar', action: 'UPDATE' },
        ]
      },
    ]
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const getActionColor = (action?: string) => {
  switch (action) {
    case 'CREATE': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'CANCEL': 
    case 'CLOSE': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'UPDATE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'READ': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getCategoryColor = (color: string) => {
  switch (color) {
    case 'rose': return 'border-rose-500/30 bg-rose-500/10';
    case 'sky': return 'border-sky-500/30 bg-sky-500/10';
    case 'green': return 'border-green-500/30 bg-green-500/10';
    case 'amber': return 'border-amber-500/30 bg-amber-500/10';
    case 'purple': return 'border-purple-500/30 bg-purple-500/10';
    default: return 'border-slate-500/30 bg-slate-500/10';
  }
};

const getCategoryTextColor = (color: string) => {
  switch (color) {
    case 'rose': return 'text-rose-400';
    case 'sky': return 'text-sky-400';
    case 'green': return 'text-green-400';
    case 'amber': return 'text-amber-400';
    case 'purple': return 'text-purple-400';
    default: return 'text-slate-400';
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['google-calendar']));
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const totalPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => subSum + sub.prompts.length, 0), 0
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSubSection = (subSectionId: string) => {
    setExpandedSubSections(prev => {
      const next = new Set(prev);
      if (next.has(subSectionId)) {
        next.delete(subSectionId);
      } else {
        next.add(subSectionId);
      }
      return next;
    });
  };

  const handlePromptClick = (prompt: Prompt) => {
    onSelectPrompt(prompt.text);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📚 Prompt Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalPrompts} demo-ready prompts • Click to use
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
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 space-y-3">
          {CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const promptCount = category.subSections.reduce((sum, sub) => sum + sub.prompts.length, 0);
            
            return (
              <div key={category.id} className={`rounded-xl border ${getCategoryColor(category.color)}`}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{category.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {promptCount} prompts
                        </span>
                      </div>
                      <span className={`text-xs ${getCategoryTextColor(category.color)}`}>
                        {category.securityFlow}
                      </span>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {category.subSections.map((subSection) => {
                      const isSubExpanded = expandedSubSections.has(subSection.id);
                      
                      return (
                        <div key={subSection.id} className="rounded-lg border border-slate-700/50 bg-slate-800/30">
                          {/* SubSection Header */}
                          <button
                            onClick={() => toggleSubSection(subSection.id)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span>{subSection.icon}</span>
                              <span className="text-sm font-medium text-slate-200">{subSection.name}</span>
                              <span className="text-xs text-slate-500">({subSection.prompts.length})</span>
                            </div>
                            <svg 
                              className={`w-4 h-4 text-slate-500 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* SubSection Content */}
                          {isSubExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {/* Info Banner */}
                              {subSection.info && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700/50">
                                  {subSection.info}
                                </div>
                              )}
                              
                              {/* Prompts */}
                              {subSection.prompts.map((prompt) => (
                                <button
                                  key={prompt.id}
                                  onClick={() => handlePromptClick(prompt)}
                                  className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600 transition-all group"
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Action Badge */}
                                    {prompt.action && (
                                      <span className={`text-xs px-2 py-1 rounded border font-medium flex-shrink-0 ${getActionColor(prompt.action)}`}>
                                        {prompt.action}
                                      </span>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                      {/* Prompt Text */}
                                      <p className="text-sm text-slate-200 leading-relaxed">
                                        {prompt.text}
                                      </p>
                                      
                                      {/* Description */}
                                      <p className="text-xs text-slate-500 mt-1">
                                        {prompt.description}
                                      </p>
                                      
                                      {/* Expected Result */}
                                      {prompt.expected && (
                                        <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                          Expected: {prompt.expected}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Arrow */}
                                    <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950">
          <p className="text-xs text-slate-500 text-center">
            All dates and values are concrete examples. Modify as needed for your demo.
          </p>
        </div>
      </div>
    </div>
  );
}
