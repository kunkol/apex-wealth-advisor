'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import IdTokenCard from '@/components/IdTokenCard';
import XAAFlowCard from '@/components/XAAFlowCard';
import MCPToolsCard from '@/components/MCPToolsCard';
import ArchitectureFlowVisual from '@/components/ArchitectureFlowVisual';
import PromptLibrary from '@/components/PromptLibrary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsCalled?: string[];
}

export default function ApexWealthAdvisor() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastXAAInfo, setLastXAAInfo] = useState<any>(null);
  const [lastToolsCalled, setLastToolsCalled] = useState<string[]>([]);
  const [showArchitecture, setShowArchitecture] = useState(true);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeWelcome = () => {
    setMessages([{
      id: '1',
      content: `Welcome to Apex Wealth Advisor, ${session?.user?.name || 'Advisor'}! I'm Buffett, your AI-powered wealth management assistant.\n\n🎯 What I can help with:\n• Client portfolio analysis & holdings\n• Compliance status checks\n• Transaction processing\n• Risk assessments\n\n💡 Try clicking "Prompt Library" above for demo scenarios, or ask me anything!`,
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
    setLastToolsCalled([]);
    setTimeout(() => initializeWelcome(), 100);
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          idToken: (session as any)?.idToken
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      if (data.token_info || data.xaa_info) {
        setLastXAAInfo({
          id_jag_token: data.xaa_info?.id_jag_token,
          mcp_access_token: data.xaa_info?.mcp_access_token,
          expires_in: data.token_info?.mcp_expires_in || data.xaa_info?.expires_in,
          scope: data.xaa_info?.scope
        });
      }

      if (data.tools_called?.length > 0) {
        setLastToolsCalled(prev => [...new Set([...prev, ...data.tools_called])]);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        toolsCalled: data.tools_called
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl animate-pulse"></div>
            <div className="absolute inset-2 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-500">AW</span>
            </div>
          </div>
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Apex Wealth Advisor...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        {/* Login Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">Enterprise AI Platform</p>
              </div>
            </div>
          </div>
        </header>

        {/* Login Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-10 text-center">
              {/* Logo */}
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/30">
                  <span className="text-4xl font-bold text-slate-900">AW</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">Apex Wealth Advisor</h1>
                <p className="text-slate-400 text-lg">AI-Powered Portfolio Management</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-10 text-left">
                <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Okta Cross-App Access (XAA)</p>
                    <p className="text-sm text-slate-400">ID-JAG secure token exchange</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🔑</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Auth0 Token Vault</p>
                    <p className="text-sm text-slate-400">Secure SaaS API credentials</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">FGA & CIBA Step-Up</p>
                    <p className="text-sm text-slate-400">Fine-grained authorization</p>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <button
                onClick={() => signIn('okta')}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:via-amber-600 hover:to-amber-700 text-slate-900 font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 flex items-center justify-center space-x-3 text-lg"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 4.8a3.6 3.6 0 110 7.2 3.6 3.6 0 010-7.2zm0 16.8a9.6 9.6 0 01-8-4.284c.04-2.652 5.333-4.116 8-4.116s7.96 1.464 8 4.116A9.6 9.6 0 0112 21.6z"/>
                </svg>
                <span>Sign in with Okta</span>
              </button>

              <p className="text-xs text-slate-600 mt-6">
                Enterprise SSO Authentication
              </p>
            </div>
          </div>
        </div>

        {/* Login Footer */}
        <footer className="border-t border-slate-800 bg-slate-900/50 py-4">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-xs text-slate-600">
              © 2024 Apex Wealth Advisor • Powered by Claude AI • Secured by Okta & Auth0
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-xl font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apex Wealth Advisor</h1>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Buffett AI</span>
                  <span className="text-slate-700">•</span>
                  <span className="text-xs text-blue-400">Okta XAA</span>
                  <span className="text-slate-700">•</span>
                  <span className="text-xs text-orange-400">Auth0 Vault</span>
                </div>
              </div>
            </div>

            {/* Center Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleNewChat}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Chat</span>
              </button>
              <button
                onClick={() => setShowPromptLibrary(!showPromptLibrary)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm ${
                  showPromptLibrary 
                    ? 'bg-amber-600 text-slate-900' 
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span>📚</span>
                <span>Prompt Library</span>
              </button>
              <button
                onClick={() => setShowArchitecture(!showArchitecture)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm ${
                  showArchitecture 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span>🏗️</span>
                <span className="hidden sm:inline">Architecture</span>
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-white">{session.user?.name}</p>
                <p className="text-xs text-slate-500">{session.user?.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-semibold border-2 border-slate-600">
                {session.user?.name?.charAt(0) || 'U'}
              </div>
              <button 
                onClick={() => signOut()} 
                className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        {/* Prompt Library Overlay */}
        {showPromptLibrary && (
          <div className="mb-4">
            <PromptLibrary
              isOpen={showPromptLibrary}
              onToggle={() => setShowPromptLibrary(false)}
              onSelectPrompt={(prompt) => setInput(prompt)}
            />
          </div>
        )}

        {/* Architecture Flow */}
        {showArchitecture && (
          <ArchitectureFlowVisual 
            isAuthenticated={!!session}
            userName={session.user?.name || 'Advisor'}
            toolsCalled={lastToolsCalled}
          />
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white text-sm">Buffett AI Assistant</span>
                    <p className="text-xs text-slate-500">Powered by Claude</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-500">Online</span>
                </div>
              </div>

              {/* Messages */}
              <div className={`${showArchitecture ? 'h-[40vh]' : 'h-[55vh]'} overflow-y-auto p-4`}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900'
                          : 'bg-slate-800 border border-slate-700 text-slate-100'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-600/50">
                            <p className="text-xs opacity-70">🔧 {msg.toolsCalled.join(', ')}</p>
                          </div>
                        )}
                        <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-amber-800' : 'text-slate-500'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                          </div>
                          <span className="text-xs text-slate-400">Buffett is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-slate-700 p-4 bg-slate-800/50">
                <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPromptLibrary(true)}
                    className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
                    title="Open Prompt Library"
                  >
                    <span>📚</span>
                  </button>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about clients, portfolios, transactions..."
                    className="flex-1 p-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-slate-400 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <IdTokenCard idToken={(session as any)?.idToken || ''} />
            <XAAFlowCard xaaInfo={lastXAAInfo} toolsCalled={lastToolsCalled} />
            <MCPToolsCard toolsCalled={lastToolsCalled} mcpServer="apex-wealth-mcp" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left - Logo & Copyright */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">AW</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">© 2024 Apex Wealth Advisor</p>
                <p className="text-xs text-slate-600">AI-Powered Portfolio Management Platform</p>
              </div>
            </div>

            {/* Center - Tech Stack */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 px-3 py-1 bg-slate-800 rounded-full">
                <span className="text-xs">🤖</span>
                <span className="text-xs text-slate-400">Claude AI</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 bg-blue-900/30 border border-blue-800 rounded-full">
                <span className="text-xs text-blue-400">Okta XAA</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 bg-orange-900/30 border border-orange-800 rounded-full">
                <span className="text-xs text-orange-400">Auth0 Vault</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 bg-purple-900/30 border border-purple-800 rounded-full">
                <span className="text-xs text-purple-400">MCP</span>
              </div>
            </div>

            {/* Right - Security Badge */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Enterprise Security Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
