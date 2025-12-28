'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsCalled?: string[];
  mcpInfo?: any;
}

const suggestedQuestions = [
  "Look up client Marcus Thompson",
  "Show me Elena Rodriguez's portfolio",
  "List all my clients",
  "What's James Chen's risk profile?",
  "Process a $500 payment for Marcus Thompson",
  "Show me Robert Williams' information",
];

export default function ApexWealthAdvisor() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (session && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: `Welcome to Apex Wealth Advisor, ${session.user?.name || 'Advisor'}! I'm Buffett, your AI assistant. I can help you with client portfolios, compliance checks, and transaction processing. How can I assist you today?`,
          role: 'assistant',
          timestamp: new Date()
        }
      ]);
    }
  }, [session, messages.length]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          idToken: (session as any)?.idToken
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        toolsCalled: data.tools_called,
        mcpInfo: data.mcp_info
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading Apex Wealth Advisor...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8 text-center">
            {/* Logo */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-slate-900">AW</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Apex Wealth Advisor</h1>
              <p className="text-slate-400">AI-Powered Portfolio Management</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8 text-left">
              <div className="flex items-center space-x-3 text-slate-300">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400">📊</span>
                </div>
                <span>Real-time portfolio analysis</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400">🔒</span>
                </div>
                <span>Secure client data access</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400">⚡</span>
                </div>
                <span>Instant compliance checks</span>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={() => signIn('okta')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-amber-500/25 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 4.8a3.6 3.6 0 110 7.2 3.6 3.6 0 010-7.2zm0 16.8a9.6 9.6 0 01-8-4.284c.04-2.652 5.333-4.116 8-4.116s7.96 1.464 8 4.116A9.6 9.6 0 0112 21.6z"/>
              </svg>
              <span>Sign in with Okta SSO</span>
            </button>

            <p className="text-xs text-slate-500 mt-6">
              Secured by Okta • Enterprise Authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-400">Buffett AI Assistant</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{session.user?.name}</p>
                <p className="text-xs text-slate-400">{session.user?.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-semibold">
                {session.user?.name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={() => signOut()}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
              {/* Chat Messages */}
              <div className="h-[65vh] overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💼</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to Apex Wealth Advisor</h2>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                      I'm Buffett, your AI assistant. I can help with client portfolios, compliance, and transactions.
                    </p>
                    
                    {/* Suggested Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setInput(question)}
                          className="text-left p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-amber-500/50 hover:bg-slate-700 transition-all duration-200 text-sm text-slate-300 hover:text-white"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-animate`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900'
                              : 'bg-slate-700/80 border border-slate-600 text-slate-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Show tools called */}
                          {message.toolsCalled && message.toolsCalled.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-500/50">
                              <p className="text-xs text-slate-400">
                                🔧 Tools: {message.toolsCalled.join(', ')}
                              </p>
                            </div>
                          )}
                          
                          <p className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-amber-800' : 'text-slate-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-700/80 border border-slate-600 rounded-2xl px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-amber-400 rounded-full typing-dot"></div>
                              <div className="w-2 h-2 bg-amber-400 rounded-full typing-dot"></div>
                              <div className="w-2 h-2 bg-amber-400 rounded-full typing-dot"></div>
                            </div>
                            <span className="text-sm text-slate-400">Buffett is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-700 p-4 bg-slate-800/80">
                <form onSubmit={handleSubmit} className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about clients, portfolios, or transactions..."
                      className="w-full p-4 pr-12 bg-slate-700/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-slate-400"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-lg hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
                
                {/* Status Bar */}
                <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span>🔒 Secure Session</span>
                    <span>⚡ Connected to MCP</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Powered by Claude AI</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Session Info Card */}
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">👤</span> Session Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400">Logged in as</p>
                    <p className="text-white font-medium">{session.user?.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Email</p>
                    <p className="text-white font-medium text-xs break-all">{session.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">ID Token</p>
                    <p className="text-green-400 text-xs">✓ Present</p>
                  </div>
                </div>
              </div>

              {/* Security Status Card */}
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🔐</span> Security Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Authentication</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-400">Okta SSO</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">MCP Server</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-400">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">XAA Token</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-yellow-400">On Demand</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">⚡</span> Quick Actions
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setInput("List all my clients")}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    📋 View All Clients
                  </button>
                  <button 
                    onClick={() => setInput("Show Marcus Thompson's portfolio")}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    📊 Sample Portfolio
                  </button>
                  <button 
                    onClick={() => setInput("Show me Robert Williams' information")}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    🔒 Test FGA Denial
                  </button>
                  <button 
                    onClick={() => setInput("Process a $15000 payment for Marcus Thompson")}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    🔐 Test CIBA Step-Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            © 2024 Apex Wealth Advisor • AI-Powered by Claude • Secured by Okta
          </p>
        </div>
      </div>
    </div>
  );
}
