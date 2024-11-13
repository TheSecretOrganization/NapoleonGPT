// src/components/ConsolePage/ConversationLog.tsx

import React from 'react'
import { X } from 'react-feather'

interface ConversationItem {
  id: string
  role?: string // Changed from 'role: string;' to 'role?: string;'
  type: string
  formatted: {
    audio?: { length: number, url?: string }
    text?: string
    transcript?: string
    tool?: { name: string, arguments: string }
    output?: string
    file?: { url: string }
  }
}

interface ConversationLogProps {
  items: ConversationItem[]
  onDeleteItem: (id: string) => void
}

export const ConversationLog: React.FC<ConversationLogProps> = ({ items, onDeleteItem }) => (
  <div className="content-block conversation">
    <div className="content-block-title">conversation</div>
    <div className="content-block-body" data-conversation-content>
      {!items.length && `awaiting connection...`}
      {items.map(item => (
        <div className="conversation-item" key={item.id}>
          <div className={`speaker ${item.role || ''}`}>
            <div>{(item.role || item.type).replaceAll('_', ' ')}</div>
            <div className="close" onClick={() => onDeleteItem(item.id)}>
              <X />
            </div>
          </div>
          <div className="speaker-content">
            {/* tool response */}
            {item.type === 'function_call_output' && (
              <div>{item.formatted.output}</div>
            )}
            {/* tool call */}
            {item.formatted.tool && (
              <div>
                {item.formatted.tool.name}
                (
                {item.formatted.tool.arguments}
                )
              </div>
            )}
            {/* user messages */}
            {!item.formatted.tool && item.role === 'user' && (
              <div>
                {item.formatted.transcript
                || (item.formatted.audio?.length
                  ? '(awaiting transcript)'
                  : item.formatted.text || '(item sent)')}
              </div>
            )}
            {/* assistant messages */}
            {!item.formatted.tool && item.role === 'assistant' && (
              <div>
                {item.formatted.transcript
                || item.formatted.text
                || '(truncated)'}
              </div>
            )}
            {/* Audio file */}
            {item.formatted.file && (
              <audio src={item.formatted.file.url} controls />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)
