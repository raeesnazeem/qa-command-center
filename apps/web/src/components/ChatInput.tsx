import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSendMessage, disabled }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 500;

  const handleSendMessage = () => {
    if (value.trim() && !disabled && value.length <= MAX_CHARS) {
      onSendMessage(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // roughly 4-5 lines
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div className="p-4 border-t border-slate-100 bg-white">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this project..."
          disabled={disabled}
          maxLength={MAX_CHARS}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all resize-none min-h-[44px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
        />
        
        <div className="absolute right-2 bottom-2 flex items-center space-x-2">
          <span className={`text-[10px] font-medium ${value.length >= MAX_CHARS ? 'text-red-400' : 'text-slate-400'}`}>
            {value.length}/{MAX_CHARS}
          </span>
          <button
            onClick={handleSendMessage}
            disabled={!value.trim() || disabled || value.length > MAX_CHARS}
            className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
