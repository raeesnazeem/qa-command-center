import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickPromptChips } from './QuickPromptChips';
import { useChat } from '../hooks/useChat';
import { useChatContext } from '../contexts/ChatContext';

export const ChatSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { currentProjectId, currentRunId } = useChatContext();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, isStreaming, sendMessage } = useChat();

  // Simple logic to determine if we are on a project-specific page
  const isProjectPage = location.pathname.includes('/projects/') && currentProjectId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text: string) => {
    sendMessage(text, currentProjectId, currentRunId);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Panel */}
      {isOpen && (
        <div 
          className="bg-white border border-slate-200 rounded-xl shadow-2xl mb-4 overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
          style={{ width: '400px', height: '600px' }}
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">QA Assistant</h3>
              </div>
              {isProjectPage && (
                <div className="flex items-center space-x-1 mt-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-medium">
                    Context: Project {currentProjectId?.substring(0, 8)}...
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">How can I help you?</h4>
                <p className="text-xs text-slate-500">Ask me about findings, runs, or project statistics.</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <ChatMessage 
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    isStreaming={msg.isStreaming}
                    citations={msg.citations}
                  />
                ))}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Prompts */}
          {messages.length === 0 && (
            <QuickPromptChips 
              onSelect={(text) => setInputValue(text)}
              disabled={isLoading || isStreaming}
            />
          )}

          {/* Input */}
          <ChatInput 
            value={inputValue}
            onChange={setInputValue}
            onSendMessage={handleSendMessage}
            disabled={isLoading || isStreaming}
          />
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-accent shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 ease-in-out"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
