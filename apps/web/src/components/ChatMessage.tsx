import React from 'react';
import { FileText } from 'lucide-react';

export interface Citation {
  source_type: string;
  source_id: string;
  content?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  citations?: Citation[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
  isStreaming = false,
  citations = [],
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col mb-4 group ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-end space-x-2 max-w-[85%]">
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all
            ${isUser 
              ? 'bg-[#76a394] text-white rounded-br-none' 
              : 'bg-white border border-slate-100 text-slate-600 rounded-bl-none'
            }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-accent animate-pulse align-middle" />
            )}
          </div>
          
          {/* Timestamp on hover */}
          <div 
            className={`absolute bottom-full mb-1 text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap
              ${isUser ? 'right-0' : 'left-0'}`}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Citations for AI messages */}
      {!isUser && citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 ml-1">
          {citations.map((citation, idx) => (
            <div 
              key={idx}
              className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] text-slate-500 font-bold uppercase tracking-tighter"
            >
              <FileText className="w-3 h-3 text-slate-400" />
              <span>
                {citation.source_type === 'finding' ? 'Finding' : 'Comment'} #{citation.source_id.substring(0, 4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
