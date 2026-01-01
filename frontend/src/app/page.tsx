'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import IdTokenCard from '@/components/IdTokenCard';
import XAAFlowCard from '@/components/XAAFlowCard';
import MCPToolsCard from '@/components/MCPToolsCard';
import TokenVaultFlow from '@/components/TokenVaultFlow';
import PromptLibrary from '@/components/PromptLibrary';
import SecurityFlowTab from '@/components/SecurityFlowTab';
import DemoGuideTab from '@/components/DemoGuideTab';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsCalled?: string[];
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  step: string;
  status: 'success' | 'pending' | 'error';
  details: {
    tokenType?: string;
    audience?: string;
    expiresIn?: number;
    scopes?: string[];
    connection?: string;
  };
  rawToken?: string;
}

export default function ApexWealthAdvisor() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastXAAInfo, setLastXAAInfo] = useState<any>(null);
  const [lastTokenVaultInfo, setLastTokenVaultInfo] = useState<any>(null);
  const [lastToolsCalled, setLastToolsCalled] = useState<string[]>([]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'agent' | 'security' | 'guide'>('agent');
  
  // TWO SEPARATE AUDIT TRAILS:
  // currentRequestEvents - resets each request (for Cards view)
  // sessionAuditLog - cumulative across session (for Logs view)
  const [currentRequestEvents, setCurrentRequestEvents] = useState<AuditEntry[]>([]);
  const [sessionAuditLog, setSessionAuditLog] = useState<AuditEntry[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeWelcome = () => {
    setMessages([{
      id: '1',
      content: `Welcome to Apex Wealth Advisor, ${session?.user?.name || 'Advisor'}! I can help you with client information, portfolio data, calendar scheduling, and transactions. How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date()
    }]);
  };

  useEffect(() => {
    if (session && messages.length === 0) {
      initializeWelcome();
    }
  }, [session]);

  const handleNewChat = () => {
    setMessages([]);
    setLastXAAInfo(null);
    setLastTokenVaultInfo(null);
    setLastToolsCalled([]);
    setCurrentRequestEvents([]);
    setSessionAuditLog([]); // Clear session log on new chat
    setTimeout(() => initializeWelcome(), 100);
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Helper to add audit entry to BOTH current request AND session log
  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setCurrentRequestEvents(prev => [...prev, newEntry]);
    setSessionAuditLog(prev => [...prev, newEntry]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    
    // RESET current request events (Cards will show fresh)
    setCurrentRequestEvents([]);

    addAuditEntry({
      step: 'User Request',
      status: 'success',
      details: { tokenType: 'User Input' }
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(session as any)?.accessToken || ''}`, 'X-ID-Token': (session as any)?.idToken || '' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          session_id: session?.user?.email || 'session'
        })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.xaa_info) {
        setLastXAAInfo(data.xaa_info);
        if (data.xaa_info.id_jag_token) {
          addAuditEntry({
            step: 'ID-JAG Token Exchange',
            status: 'success',
            details: { tokenType: 'ID-JAG', expiresIn: data.xaa_info.id_jag_expires_in || 300 },
            rawToken: data.xaa_info.id_jag_token
          });
        }
        if (data.xaa_info.mcp_token) {
          addAuditEntry({
            step: 'MCP Auth Server Token',
            status: 'success',
            details: { tokenType: 'MCP Token', expiresIn: data.xaa_info.mcp_token_expires_in || 3600, scopes: ['mcp:read'] },
            rawToken: data.xaa_info.mcp_token
          });
        }
      }
      
      if (data.token_vault_info) {
        setLastTokenVaultInfo(data.token_vault_info);
        if (data.token_vault_info.vault_token) {
          addAuditEntry({
            step: 'Auth0 Vault Token',
            status: 'success',
            details: { tokenType: 'Vault Token', audience: 'vault.dell.auth101.dev' },
            rawToken: data.token_vault_info.vault_token
          });
        }
        // GOOGLE TOKEN - Add audit entry if present
        if (data.token_vault_info.google_token) {
          addAuditEntry({
            step: 'Google Calendar Token',
            status: 'success',
            details: { tokenType: 'Google Access Token', connection: 'google-oauth2', expiresIn: data.token_vault_info.google_expires_in },
            rawToken: data.token_vault_info.google_token
          });
        }
        // SALESFORCE TOKEN - Add audit entry if present (NEW!)
        if (data.token_vault_info.salesforce_token) {
          addAuditEntry({
            step: 'Salesforce Token',
            status: 'success',
            details: { tokenType: 'Salesforce Access Token', connection: 'salesforce', expiresIn: data.token_vault_info.salesforce_expires_in },
            rawToken: data.token_vault_info.salesforce_token
          });
        }
      }
      
      if (data.tools_called?.length > 0) {
        setLastToolsCalled(data.tools_called); // Replace instead of append for current request
        data.tools_called.forEach((tool: string) => {
          addAuditEntry({
            step: `Tool: ${tool}`,
            status: 'success',
            details: { tokenType: 'Tool Execution' }
          });
        });
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.error || 'No response',
        timestamp: new Date(),
        toolsCalled: data.tools_called
      }]);

    } catch (error) {
      setIsTyping(false);
      addAuditEntry({ step: 'Error', status: 'error', details: { tokenType: 'Request Failed' } });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">AW</span>
          </div>
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">AI-Powered Portfolio Management</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-slate-900">AW</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-slate-400 mb-8">Sign in to manage your client portfolios</p>

              <button
                onClick={() => signIn('okta')}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a7.2 7.2 0 110 14.4 7.2 7.2 0 010-14.4z"/>
                </svg>
                Sign in with Okta
              </button>

              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Enterprise SSO
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    MFA Protected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header with tabs */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">AI Agent Security Demo</p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveMainTab('agent')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMainTab === 'agent' 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🤖</span> Agent
              </button>
              <button
                onClick={() => setActiveMainTab('security')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMainTab === 'security' 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔐</span> Security Flow
              </button>
              <button
                onClick={() => setActiveMainTab('guide')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMainTab === 'guide' 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📖</span> Demo Guide
              </button>
              <button
                onClick={() => setShowPromptLibrary(true)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-white"
              >
                <span>📋</span> Prompts
              </button>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
              >
                <span>+</span> New Chat
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-medium text-blue-400">Secured by Okta for AI Agents</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-400">Online</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
              </div>
              <button 
                onClick={() => signOut()} 
                className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelectPrompt={(prompt) => {
          setInput(prompt);
          setShowPromptLibrary(false);
        }}
      />

      {/* Main Content - Tab Panels */}
      <main className="flex-1 overflow-hidden">
        {/* TAB 1: Agent (2-column layout: Chat + Token Cards) */}
        {activeMainTab === 'agent' && (
          <div className="h-full p-2">
            <div className="h-full grid grid-cols-12 gap-2">
              
              {/* LEFT: Chat - 8 cols */}
              <div className="col-span-8 flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === 'user' ? (
                          <div className="flex justify-end">
                            <div className="bg-amber-500 text-slate-900 px-4 py-3 rounded-2xl rounded-br-sm max-w-xl">
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs text-amber-800 mt-1">{formatTime(msg.timestamp)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm p-4 max-w-3xl">
                            <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                            {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-1">
                                {msg.toolsCalled.map((tool, i) => (
                                  <span 
                                    key={i} 
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      tool.includes('salesforce') 
                                        ? 'bg-sky-900 text-sky-300'
                                        : tool.includes('calendar') || tool.includes('availability')
                                        ? 'bg-rose-900 text-rose-300'
                                        : 'bg-green-900 text-green-300'
                                    }`}
                                  >
                                    ✓ {tool}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2">{formatTime(msg.timestamp)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 max-w-md">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Enhanced Footer / Input Area */}
                <div className="border-t border-slate-700 bg-slate-900">
                  {/* Input Row */}
                  <div className="p-4">
                    <form onSubmit={handleSubmit} className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (input.trim() && !isLoading) {
                                handleSubmit(e);
                              }
                            }
                          }}
                          placeholder="Ask about clients, portfolios, calendar, transactions..."
                          className="w-full p-4 pr-12 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-slate-400 text-sm resize-none"
                          disabled={isLoading}
                          rows={2}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPromptLibrary(true)}
                          className="absolute right-3 top-3 p-2 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Browse prompts"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </form>
                  </div>
                  
                  {/* Footer Branding */}
                  <div className="px-4 pb-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>Powered by Claude AI</span>
                      <span className="text-slate-700">•</span>
                      <span>User-Delegated Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <span>All tokens active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Security Status - Business Focused - 4 cols */}
              <div className="col-span-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white">🛡️ Security Status</h3>
                  <p className="text-[10px] text-slate-500">Your session is protected</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Identity Verified Card */}
                  <div className="p-3 rounded-lg border border-green-500/30 bg-green-900/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400 text-lg">✓</span>
                      <span className="text-sm font-medium text-white">Identity Verified</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Signed in as <span className="text-cyan-400">{session?.user?.email}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Your identity is securely delegated to the AI agent</p>
                  </div>
                  
                  {/* Agent Authorized Card */}
                  {lastXAAInfo?.token_obtained && (
                    <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-cyan-400 text-lg">🔐</span>
                        <span className="text-sm font-medium text-white">Agent Authorized</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Limited access granted with <span className="text-green-400">least-privilege</span> scope
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Token expires in {lastXAAInfo?.mcp_token_expires_in || 3600}s</p>
                    </div>
                  )}
                  
                  {/* External Access Card - Google Calendar */}
                  {lastToolsCalled.some(t => t.includes('calendar') || t.includes('availability')) && (
                    <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-rose-400 text-lg">📅</span>
                        <span className="text-sm font-medium text-white">Calendar Connected</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Google Calendar accessed with your consent
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Read-only access via Token Vault</p>
                    </div>
                  )}
                  
                  {/* External Access Card - Salesforce */}
                  {lastToolsCalled.some(t => t.includes('salesforce')) && (
                    <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sky-400 text-lg">☁️</span>
                        <span className="text-sm font-medium text-white">Salesforce Connected</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        CRM data accessed with your permissions
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Scoped to your Salesforce access level</p>
                    </div>
                  )}
                  
                  {/* Tools Called Summary */}
                  {lastToolsCalled.length > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-400 text-lg">⚡</span>
                        <span className="text-sm font-medium text-white">Actions Completed</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lastToolsCalled.map((tool, i) => (
                          <span 
                            key={i} 
                            className={`text-[10px] px-2 py-0.5 rounded ${
                              tool.includes('salesforce') 
                                ? 'bg-sky-500/20 text-sky-300'
                                : tool.includes('calendar') || tool.includes('availability')
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            ✓ {tool.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Security Assurance */}
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">🛡️</span>
                      <div>
                        <p className="text-xs font-medium text-slate-300">Your Data is Protected</p>
                        <ul className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                          <li>• Credentials never shared with AI</li>
                          <li>• All actions logged to audit trail</li>
                          <li>• Short-lived tokens only</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">User-Delegated Access</span>
                    <span className="text-[10px] text-green-400">● Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Security Flow - Pass BOTH arrays and toolsCalled */}
        {activeMainTab === 'security' && (
          <SecurityFlowTab 
            session={session}
            currentRequestEvents={currentRequestEvents}
            sessionAuditLog={sessionAuditLog}
            xaaInfo={lastXAAInfo}
            tokenVaultInfo={lastTokenVaultInfo}
            toolsCalled={lastToolsCalled}
          />
        )}

        {/* TAB 3: Demo Guide */}
        {activeMainTab === 'guide' && (
          <DemoGuideTab />
        )}
      </main>
    </div>
  );
}
