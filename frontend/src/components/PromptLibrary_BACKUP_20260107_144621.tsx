/**
 * PromptLibrary.tsx
 * PRODUCTION-READY - All prompts tested and verified (January 3, 2026)
 * 
 * Key principles:
 * - Explicit tool routing (Use Google Calendar to..., Use Salesforce to..., Use Apex MCP server to...)
 * - Concrete dates, times, timezone (January 15th, 2026 at 2:00 PM PST)
 * - Explicit year to avoid auto-increment bugs
 * - Event IDs for cancel operations
 * - No apostrophes/special chars that might cause issues
 * 
 * TESTED PROMPTS are marked with ✓ and placed at the TOP of each section
 * ADDITIONAL PROMPTS are below for future use
 * 
 * Calendar Timezone Note: Events created in PST display in IST (+1 day in calendar view)
 * Cancel operations should use the DISPLAYED date (IST), not the original PST date
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
  note?: string;
  tested?: boolean;
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
// TESTED & VERIFIED PROMPTS (January 3, 2026)
// =============================================================================

const CATEGORIES: Category[] = [
  // =========================================================================
  // SALESFORCE (Token Vault)
  // =========================================================================
  {
    id: 'salesforce',
    name: 'Client CRM',
    icon: '👥',
    securityFlow: 'Salesforce via Token Vault',
    color: 'sky',
    subSections: [
      {
        id: 'sf-read',
        name: 'Read - Contacts and Opportunities',
        icon: '📖',
        prompts: [
          // ✓ TESTED
          { 
            id: 'sf-1', 
            text: 'Use Salesforce to look up the contact details for Marcus Thompson. I need his phone number and email for a follow-up call about his portfolio.', 
            description: '✓ Contact lookup - Marcus Thompson', 
            action: 'READ',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'sf-2', 
            text: 'Use Salesforce to get opportunities for Elena Rodriguez. I want to see the status of her retirement rollover deal.', 
            description: '✓ Opportunities for Elena Rodriguez', 
            action: 'READ',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'sf-3', 
            text: 'Use Salesforce to search for contacts at Chen Industries.', 
            description: '✓ Search by company - Chen Industries', 
            action: 'READ',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'sf-3b', 
            text: 'Use Salesforce to look up the contact details for Priya Patel. I need to discuss her growth portfolio strategy.', 
            description: 'Contact lookup - Priya Patel', 
            action: 'READ' 
          },
          { 
            id: 'sf-3c', 
            text: 'Use Salesforce to get opportunities for Robert Williams at Williams Estate.', 
            description: 'Opportunities - Williams Estate', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'sf-create',
        name: 'Create - Records',
        icon: '➕',
        prompts: [
          // ✓ TESTED
          { 
            id: 'sf-4', 
            text: 'Use Salesforce to create a new contact: Mr. David Park, Chief Investment Officer at Park Family Investments. Phone: (650) 555-7001, Mobile: (650) 555-7002, Email: david.park@parkinvestments.com. Address: 500 University Avenue Suite 300, Palo Alto, CA 94301. Lead Source: Partner Referral. Description: High-net-worth client referral from James Chen with $5M in investable assets.', 
            description: '✓ Create new contact - David Park (full details)', 
            action: 'CREATE',
            note: 'Auto-creates Account if it does not exist. Delete after demo to keep data clean.',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'sf-5', 
            text: 'Use Salesforce to create a follow-up task for Marcus Thompson with subject "Q1 Portfolio Review Prep" due on January 10th, 2026. Priority is High. Description: Prepare portfolio analysis and rebalancing recommendations before client meeting.', 
            description: '✓ Create follow-up task - Marcus Thompson', 
            action: 'CREATE',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'sf-6', 
            text: 'Use Salesforce to add a note to the Thompson Family Trust account with title "Client Meeting Notes" and body: Discussed retirement timeline, client interested in increasing bond allocation. Follow up on tax-loss harvesting options.', 
            description: '✓ Add account note - Thompson Family Trust', 
            action: 'CREATE',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'sf-6b', 
            text: 'Use Salesforce to create a follow-up task for Elena Rodriguez with subject "Retirement Planning Review" due on January 15th, 2026. Priority is High. Description: Review 401k rollover options and discuss income distribution strategy.', 
            description: 'Create task - Elena Rodriguez', 
            action: 'CREATE' 
          },
        ]
      },
      {
        id: 'sf-update',
        name: 'Update - Opportunities',
        icon: '✏️',
        info: 'Valid stages: Prospecting, Qualification, Needs Analysis, Value Proposition, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost',
        prompts: [
          // ✓ TESTED
          { 
            id: 'sf-7', 
            text: 'Use Salesforce to update the Retirement Rollover - Rodriguez opportunity stage from Proposal/Price Quote to Negotiation/Review.', 
            description: '✓ Advance opportunity stage - Rodriguez', 
            action: 'UPDATE',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'sf-7b', 
            text: 'Use Salesforce to update the opportunity stage for Portfolio Rebalancing - Thompson to Closed Won.', 
            description: 'Mark Thompson as Closed Won', 
            action: 'UPDATE' 
          },
          { 
            id: 'sf-8', 
            text: 'Use Salesforce to update the opportunity stage for Business Succession - Chen to Value Proposition.', 
            description: 'Advance Chen to Value Proposition', 
            action: 'UPDATE' 
          },
        ]
      },
      {
        id: 'sf-pipeline',
        name: 'Pipeline and Analytics',
        icon: '📊',
        prompts: [
          { 
            id: 'sf-9', 
            text: 'Use Salesforce to show me the current sales pipeline summary grouped by stage.', 
            description: 'Pipeline by stage', 
            action: 'READ' 
          },
          { 
            id: 'sf-10', 
            text: 'Use Salesforce to get the total value of all open opportunities in the pipeline.', 
            description: 'Total pipeline value', 
            action: 'READ' 
          },
          { 
            id: 'sf-11', 
            text: 'Use Salesforce to find opportunities with value over $200,000.', 
            description: 'High-value opportunities', 
            action: 'READ' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // GOOGLE CALENDAR (Token Vault)
  // =========================================================================
  {
    id: 'google-calendar',
    name: 'Scheduling',
    icon: '📅',
    securityFlow: 'Google Calendar via Token Vault',
    color: 'rose',
    subSections: [
      {
        id: 'gc-create',
        name: 'Create Meetings',
        icon: '➕',
        info: 'Creates real calendar events. Note: PST times display as +1 day in IST calendar view.',
        prompts: [
          // ✓ TESTED
          { 
            id: 'gc-3', 
            text: 'Use Google Calendar to schedule a portfolio review meeting with Marcus Thompson (marcus@thompsonfamilytrust.com) for January 7th, 2026 at 2:00 PM PST.', 
            description: '✓ Portfolio review - Marcus Thompson', 
            action: 'CREATE',
            note: 'Will display as Jan 8th ~3:30am in IST calendar view',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'gc-4', 
            text: 'Use Google Calendar to set up a retirement planning session with Elena Rodriguez (elena.rodriguez@email.com) for January 20th, 2026 at 10:00 AM PST. We will be reviewing her 401k rollover options and tax implications.', 
            description: 'Retirement planning - Elena Rodriguez', 
            action: 'CREATE'
          },
          { 
            id: 'gc-5', 
            text: 'Use Google Calendar to schedule a business succession meeting with James Chen (jchen@chenindustries.com) for January 22nd, 2026 at 3:00 PM PST.', 
            description: 'Business succession - James Chen', 
            action: 'CREATE'
          },
        ]
      },
      {
        id: 'gc-cancel',
        name: 'Cancel Meetings',
        icon: '❌',
        info: 'Use the DATE SHOWN ON CALENDAR (IST view = +1 day from PST)',
        prompts: [
          // ✓ TESTED
          { 
            id: 'gc-6', 
            text: 'Use Google Calendar to cancel my meeting with Marcus Thompson on January 8th, 2026.', 
            description: '✓ Cancel meeting by name and date (use IST display date)', 
            action: 'CANCEL',
            note: 'If you created meeting for Jan 7th PST, it shows as Jan 8th in IST - use Jan 8th to cancel',
            tested: true
          },
        ]
      },
      {
        id: 'gc-view',
        name: 'View Meetings',
        icon: '📖',
        prompts: [
          { 
            id: 'gc-1', 
            text: 'Use Google Calendar to show me all my meetings scheduled for this week. I want to plan my availability for client calls.', 
            description: 'List weekly events', 
            action: 'READ' 
          },
          { 
            id: 'gc-2', 
            text: 'Use Google Calendar to check what client meetings I have tomorrow. I need to prepare my talking points and review portfolios.', 
            description: 'Tomorrow meetings', 
            action: 'READ' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // APEX MCP SERVER (Okta XAA)
  // =========================================================================
  {
    id: 'apex-mcp',
    name: 'Portfolio Management',
    icon: '💼',
    securityFlow: 'Internal System via Okta XAA',
    color: 'green',
    subSections: [
      {
        id: 'mcp-read',
        name: 'Read - Client and Portfolio Data',
        icon: '📖',
        prompts: [
          // ✓ TESTED
          { 
            id: 'mcp-1', 
            text: 'Use the Apex MCP server to show me my complete client roster with their AUM and risk profile.', 
            description: '✓ Client roster with AUM and risk profiles', 
            action: 'READ',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'mcp-2', 
            text: 'Use the Apex MCP server to pull up the full portfolio breakdown for Marcus Thompson including asset allocation and YTD performance.', 
            description: '✓ Portfolio details - Marcus Thompson', 
            action: 'READ',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'mcp-3', 
            text: 'Use the Apex MCP server to show all transactions for Elena Rodriguez in the last 90 days. I am preparing for her quarterly review meeting.', 
            description: 'Transaction history - Elena Rodriguez', 
            action: 'READ' 
          },
          { 
            id: 'mcp-4', 
            text: 'Use the Apex MCP server to get our total assets under management across all clients. I need this metric for the monthly leadership report.', 
            description: 'Total AUM', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'mcp-update',
        name: 'Update - Client Profiles',
        icon: '✏️',
        prompts: [
          { 
            id: 'mcp-5', 
            text: 'Use the Apex MCP server to update Elena Rodriguez risk profile from Moderate to Conservative. She is approaching retirement and wants to reduce volatility.', 
            description: 'Update risk profile', 
            action: 'UPDATE' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // HITL TRANSACTIONS (Okta XAA + Step-Up)
  // =========================================================================
  {
    id: 'hitl',
    name: 'Transactions & Approvals',
    icon: '💸',
    securityFlow: 'HITL Governance via Okta XAA',
    color: 'amber',
    subSections: [
      {
        id: 'hitl-auto',
        name: 'Auto-Approved (Under $10K)',
        icon: '✅',
        info: 'Amount under $10,000 - Processes immediately without human review',
        prompts: [
          // ✓ TESTED
          { 
            id: 'hitl-1', 
            text: 'Use the Apex MCP server to process a $5,000 transfer from Marcus Thompson brokerage account to his checking account.', 
            description: '✓ Small transfer - auto-approved', 
            action: 'CREATE', 
            expected: 'Transaction completes immediately. No approval required.',
            tested: true
          },
        ]
      },
      {
        id: 'hitl-manager',
        name: 'Manager Approval ($10K-$50K)',
        icon: '⚠️',
        info: 'Amount $10,000-$50,000 - Requires CIBA step-up authentication',
        prompts: [
          // ✓ TESTED
          { 
            id: 'hitl-2', 
            text: 'Use the Apex MCP server to process a $25,000 transfer from Elena Rodriguez IRA to her savings account.', 
            description: '✓ Medium transfer - CIBA step-up required', 
            action: 'CREATE', 
            expected: 'CIBA step-up authentication triggered. Push notification sent to device.',
            tested: true
          },
        ]
      },
      {
        id: 'hitl-vp',
        name: 'VP Approval ($50K-$250K)',
        icon: '⚠️',
        info: 'Amount $50,000-$250,000 - Requires VP-level approval',
        prompts: [
          { 
            id: 'hitl-3', 
            text: 'Use the Apex MCP server to process a $150,000 transfer from James Chen trust account to his business operating account for a real estate investment.', 
            description: 'Large transfer - VP approval required', 
            action: 'CREATE', 
            expected: 'Transaction pending. Routed to VP Michael Roberts. Review time: 4-8 hours.' 
          },
        ]
      },
      {
        id: 'hitl-exec',
        name: 'Executive Approval (Over $250K)',
        icon: '🛑',
        info: 'Amount over $250,000 - Requires CFO and Compliance approval',
        prompts: [
          { 
            id: 'hitl-4', 
            text: 'Use the Apex MCP server to process a $500,000 transfer from Marcus Thompson investment account to an external brokerage at Fidelity for portfolio consolidation.', 
            description: 'Very large transfer - executive approval', 
            action: 'CREATE', 
            expected: 'Multi-level approval: Manager then VP then CFO then Compliance. ETA: 1-2 business days.' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // COMBINED MULTI-SYSTEM WORKFLOWS
  // =========================================================================
  {
    id: 'combined',
    name: 'Multi-System Workflows',
    icon: '🔄',
    securityFlow: 'Combined: XAA + Token Vault',
    color: 'purple',
    subSections: [
      {
        id: 'comb-dual',
        name: 'Dual System (2 tools)',
        icon: '🔗',
        info: 'Demonstrates Salesforce + MCP in single request',
        prompts: [
          // ✓ TESTED
          { 
            id: 'comb-1', 
            text: 'I have a meeting with Marcus Thompson next week. Use Salesforce to get his contact details, then use the Apex MCP server to pull his current portfolio summary so I can prepare.', 
            description: '✓ Salesforce + MCP lookup (2 tools)', 
            action: 'READ',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'comb-1b', 
            text: 'Use Salesforce to look up contact information for James Chen. Then use the Apex MCP server to show his portfolio if he is an existing client.', 
            description: 'Salesforce + MCP lookup - James Chen', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'comb-triple',
        name: 'Triple System (SF + MCP + Calendar)',
        icon: '🔗',
        info: 'Demonstrates all three systems: Salesforce + Apex MCP + Google Calendar',
        prompts: [
          // ✓ TESTED
          { 
            id: 'comb-2', 
            text: 'I need to prepare for a client review with Elena Rodriguez. Use Salesforce to get her contact details and opportunities, use the Apex MCP server to pull her portfolio summary, and then schedule a portfolio review meeting with her (elena.rodriguez@email.com) for January 8th, 2026 at 10:00 AM PST.', 
            description: '✓ Triple hybrid - Elena Rodriguez (5 tools)', 
            action: 'CREATE',
            note: 'Calls: search_salesforce_contacts, get_contact_opportunities, get_client, get_portfolio, create_calendar_event',
            tested: true
          },
          // ✓ TESTED
          { 
            id: 'comb-3', 
            text: 'James Chen from Chen Industries wants to discuss business succession planning. Look up his Salesforce contact and opportunity details, check his portfolio in the Apex MCP server, and schedule a meeting with him (jchen@chenindustries.com) for January 10th, 2026 at 3:00 PM PST.', 
            description: '✓ Triple hybrid - James Chen (4 tools)', 
            action: 'CREATE',
            note: 'Calls: search_salesforce_contacts, get_contact_opportunities, get_client, create_calendar_event',
            tested: true
          },
          // ADDITIONAL
          { 
            id: 'comb-4', 
            text: 'First, use the Apex MCP server to get Marcus Thompson current portfolio value and YTD performance. Then, use Google Calendar to schedule a Q1 review meeting with him (marcus@thompsonfamilytrust.com) for January 25th, 2026 at 2:00 PM PST to discuss rebalancing his equity allocation.', 
            description: 'MCP + Calendar - Marcus Thompson', 
            action: 'CREATE' 
          },
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['salesforce']));
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set(['sf-read']));

  if (!isOpen) return null;

  const totalPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => subSum + sub.prompts.length, 0), 0
  );

  const testedPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => 
      subSum + sub.prompts.filter(p => p.tested).length, 0), 0
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
              {testedPrompts} tested ✓ / {totalPrompts} total prompts - Click to use
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
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4 space-y-3">
          {CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const promptCount = category.subSections.reduce((sum, sub) => sum + sub.prompts.length, 0);
            const testedCount = category.subSections.reduce((sum, sub) => 
              sum + sub.prompts.filter(p => p.tested).length, 0);
            
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
                          {testedCount}✓ / {promptCount}
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
                      const subTestedCount = subSection.prompts.filter(p => p.tested).length;
                      
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
                              <span className="text-xs text-slate-500">
                                ({subTestedCount > 0 ? `${subTestedCount}✓/` : ''}{subSection.prompts.length})
                              </span>
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
                                  className={`w-full text-left p-3 rounded-lg border transition-all group ${
                                    prompt.tested 
                                      ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50' 
                                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600'
                                  }`}
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
                                      <p className={`text-xs mt-1 ${prompt.tested ? 'text-green-400' : 'text-slate-500'}`}>
                                        {prompt.description}
                                      </p>
                                      
                                      {/* Note */}
                                      {prompt.note && (
                                        <div className="mt-2 text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                          {prompt.note}
                                        </div>
                                      )}
                                      
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
            ✓ = Tested Jan 3, 2026 | Dates use explicit year (2026) | PST times display +1 day in IST calendar
          </p>
        </div>
      </div>
    </div>
  );
}
