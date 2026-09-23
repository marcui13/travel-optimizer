import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Send, Zap, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Trip, OptimizationResult } from '@domain/types';
import { executeWhatIfScenario, WhatIfResponse } from '@services/ai/whatIfEngine';
import { defaultOptimizer } from '@services/optimization/optimizer';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { ProfileOptimizerBar } from '../../components/assistant/ProfileOptimizerBar';
import { ChatMessageBubble, ChatMessage } from '../../components/assistant/ChatMessageBubble';

export default function AssistantTabScreen() {
  const { trip, updateTrip } = useMobileTrip();
  const { lang, t } = useMobileI18n();

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: t.assistant.greeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isProcessing]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isProcessing) return;

    Haptics.selectionAsync().catch(() => {});

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputText('');
    setIsProcessing(true);

    try {
      const response = await executeWhatIfScenario(trip, textToSend);

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: response.explanation || response.impactSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        whatIfProposal: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text:
            lang === 'es'
              ? 'Ocurrió un error al procesar el escenario. Prueba reformular tu petición.'
              : 'Error processing scenario. Please try rephrasing.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectProfile = async (profile: 'efficient' | 'balanced' | 'relaxed') => {
    if (isProcessing) return;

    const labelMap = {
      efficient: t.assistant.efficient,
      balanced: t.constraints.balanced,
      relaxed: t.assistant.relaxed,
    };

    const userMsg: ChatMessage = {
      id: `user-prof-${Date.now()}`,
      sender: 'user',
      text: `${lang === 'es' ? 'Optimizar ruta con perfil' : 'Optimize route with profile'}: ${labelMap[profile]}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const result: OptimizationResult = await defaultOptimizer.optimize(trip, { profile });

      const updatedTrip: Trip = {
        ...trip,
        destinations: result.proposedDestinations || trip.destinations,
        transportation: result.proposedTransportation || trip.transportation,
        itinerary: result.proposedItinerary || trip.itinerary,
        updatedAt: new Date().toISOString(),
      };

      const proposal: WhatIfResponse = {
        userIntent: `Profile optimization: ${profile}`,
        explanation: result.explanation,
        impactSummary: `${result.changes.length} ${t.assistant.adjustments}. ${
          result.metrics?.travelTimeBefore && result.metrics?.travelTimeAfter
            ? `Tiempo de viaje: ${Math.round(result.metrics.travelTimeBefore / 60)}h → ${Math.round(
                result.metrics.travelTimeAfter / 60
              )}h.`
            : ''
        }`,
        actionable: true,
        proposedTrip: updatedTrip,
        tradeOffs: result.changes.map((c) => c.description),
        engineUsed: 'local',
        modelName: 'Heuristic Optimizer',
      };

      const astMsg: ChatMessage = {
        id: `ast-prof-${Date.now()}`,
        sender: 'assistant',
        text: result.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        whatIfProposal: proposal,
      };

      setMessages((prev) => [...prev, astMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyProposal = (proposedTrip: Trip) => {
    updateTrip(proposedTrip);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.whatIfProposal?.proposedTrip?.id === proposedTrip.id
          ? { ...msg, isApplied: true }
          : msg
      )
    );
  };

  const quickChips = [
    t.assistant.chipFitCroatia,
    t.assistant.chipRelaxed,
    t.assistant.chipTrainsOnly,
    t.assistant.chipMoreItaly,
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      className="flex-1 bg-slate-950"
    >
      <MobileHeader />

      <View className="flex-1 px-4 pt-2">
        {/* Quick Heuristic Profiles Bar */}
        <ProfileOptimizerBar
          onSelectProfile={handleSelectProfile}
          isOptimizing={isProcessing}
        />

        {/* Scrollable Messages Stream */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              onApplyProposal={handleApplyProposal}
            />
          ))}

          {isProcessing && (
            <View className="flex-row items-center space-x-2 py-2.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 self-start mb-3">
              <ActivityIndicator color="#10b981" size="small" />
              <Text className="text-xs text-slate-300 italic">
                {t.assistant.evaluating}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View className="py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2 }}
          >
            {quickChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                disabled={isProcessing}
                onPress={() => handleSendMessage(chip)}
                activeOpacity={0.7}
                className="mr-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 active:border-brand-500/60"
              >
                <Text className="text-xs font-medium text-slate-300">
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex-row items-center space-x-2 mb-3 shadow-xl">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.assistant.inputPlaceholder}
            placeholderTextColor="#64748b"
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
            className="flex-1 text-xs text-white px-2 py-1"
          />

          <TouchableOpacity
            disabled={!inputText.trim() || isProcessing}
            onPress={() => handleSendMessage()}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              inputText.trim() && !isProcessing
                ? 'bg-brand-600 active:bg-brand-500'
                : 'bg-slate-800 opacity-40'
            }`}
          >
            <Send color="#ffffff" size={15} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
