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
    <div className="fixed bottom-0 right-0 left-64 z-50 flex flex-col pointer-events-none">
      {/* Expanded Panel */}
      <div 
        className={`bg-white border-t border-slate-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-all duration-300 ease-in-out pointer-events-auto ${isOpen ? 'h-[500px]' : 'h-0'}`}
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-3 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">QA Assistant Console</h3>
            </div>
            {isProjectPage && (
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                Target: {currentProjectId}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-accent" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">Ready for input</h4>
              <p className="text-[10px] text-slate-500">Ask about projects, tasks, or request mutations.</p>
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
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-xl rounded-bl-none shadow-sm flex items-center space-x-1">
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="px-6 pb-2">
            <QuickPromptChips 
              onSelect={(text) => setInputValue(text)}
              disabled={isLoading || isStreaming}
            />
          </div>
        )}

        {/* Input */}
        <div className="shrink-0">
          <ChatInput 
            value={inputValue}
            onChange={setInputValue}
            onSendMessage={handleSendMessage}
            disabled={isLoading || isStreaming}
          />
        </div>
      </div>

      {/* Terminal Bar (Always visible at the bottom) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-50 transition-colors pointer-events-auto shadow-sm"
      >
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isStreaming || isLoading ? 'bg-accent animate-pulse shadow-[0_0_8px_rgba(118,163,148,0.6)]' : 'bg-slate-300'}`} />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">QA Assistant Terminal</span>
          {isStreaming && (
            <span className="text-[9px] font-medium text-accent animate-pulse italic">Thinking...</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-[9px] font-medium text-slate-400">
            {isProjectPage ? `Context: Active` : 'No context'}
          </span>
          <div className="w-px h-4 bg-slate-200" />
          {isOpen ? (
            <X className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>
    </div>

  );
};
