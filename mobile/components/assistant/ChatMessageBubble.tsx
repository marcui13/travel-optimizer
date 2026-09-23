import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles, User } from 'lucide-react-native';
import { Trip } from '@domain/types';
import { WhatIfResponse } from '@services/ai/whatIfEngine';
import { WhatIfProposalCard } from './WhatIfProposalCard';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  whatIfProposal?: WhatIfResponse;
  isApplied?: boolean;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onApplyProposal?: (proposedTrip: Trip) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  onApplyProposal,
}) => {
  const isUser = message.sender === 'user';

  return (
    <View className={`mb-3 flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm border ${
          isUser
            ? 'bg-slate-800 border-slate-700 rounded-tr-none'
            : 'bg-slate-900/90 border-slate-800 rounded-tl-none'
        }`}
      >
        {/* Header Indicator */}
        <View className="flex-row items-center space-x-1.5 mb-1.5">
          {isUser ? (
            <User color="#94a3b8" size={11} />
          ) : (
            <Sparkles color="#10b981" size={11} />
          )}
          <Text className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
            {isUser ? 'Tú' : 'Copiloto IA'}
          </Text>
        </View>

        {/* Text Content */}
        <Text className="text-xs text-slate-100 leading-relaxed">
          {message.text}
        </Text>

        {/* Embedded What-If Proposal Card */}
        {Boolean(message.whatIfProposal && onApplyProposal) && (
          <WhatIfProposalCard
            proposal={message.whatIfProposal!}
            onApply={onApplyProposal!}
            isApplied={message.isApplied}
          />
        )}

        {/* Timestamp */}
        <Text
          className={`text-[9px] font-mono mt-2 text-right ${
            isUser ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
};
