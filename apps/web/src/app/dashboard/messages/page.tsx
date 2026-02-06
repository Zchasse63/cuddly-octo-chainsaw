'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  AlertCircle,
  Loader,
  Sparkles,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { AIBadge } from '@/components/ai/AIBadge';
import { useToast } from '@/hooks/useToast';

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAISuggested, setIsAISuggested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { showToast } = useToast();
  const { data: conversations, isLoading, error } = trpc.coachDashboard.getConversations.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const sendMessageMutation = trpc.coachDashboard.sendMessage.useMutation({
    onMutate: async (newMessage) => {
      const conversationId = selectedConversation?.id || '';

      // Cancel outgoing refetches
      await utils.coachDashboard.getMessages.cancel();

      // Snapshot previous messages
      const previousMessages = utils.coachDashboard.getMessages.getData({ conversationId });

      // Optimistically add message with proper structure
      utils.coachDashboard.getMessages.setData({ conversationId }, (old: any) => {
        if (!old) return old;

        const tempMessage = {
          id: `temp-${Date.now()}`,
          content: newMessage.content,
          senderId: 'temp-coach-id',
          senderRole: 'coach',
          createdAt: new Date(),
          sending: true, // Flag for UI
        };

        return [...old, tempMessage];
      });

      return { previousMessages, conversationId };
    },
    onSuccess: () => {
      setIsAISuggested(false);
      showToast('Message sent', 'success');
    },
    onError: (error: any, newMessage: any, context: any) => {
      // Rollback on error
      if (context?.previousMessages && context?.conversationId) {
        utils.coachDashboard.getMessages.setData({ conversationId: context.conversationId }, context.previousMessages);
      }
      showToast('Failed to send message', 'error');
    },
    onSettled: () => {
      utils.coachDashboard.getMessages.invalidate();
    },
  });

  const aiAssistMutation = trpc.coachDashboard.generateAISuggestedResponse.useMutation();

  const filteredConversations = (conversations || []).filter((conv) =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = selectedConversationId
    ? filteredConversations.find((c) => c.id === selectedConversationId) || filteredConversations[0]
    : filteredConversations[0];

  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = trpc.coachDashboard.getMessages.useQuery(
    { conversationId: selectedConversation?.id || '' },
    {
      enabled: !!selectedConversation,
      refetchOnWindowFocus: true,
      refetchInterval: selectedConversation ? 30 * 1000 : false, // 30 seconds when conversation selected
    }
  );

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesData) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData]);

  const handleSendMessage = async () => {
    if (messageText.trim() && selectedConversation) {
      try {
        await sendMessageMutation.mutateAsync({
          clientId: selectedConversation.clientId,
          content: messageText,
        });
        setMessageText('');
      } catch (err) {
        // Error handled by mutation state
      }
    }
  };

  const handleAIAssist = async () => {
    if (!selectedConversation) return;

    try {
      // Build conversation context from messages
      const conversationContext = (messagesData || []).slice(-10).map(m => ({
        role: m.senderRole === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      const result = await aiAssistMutation.mutateAsync({
        clientId: selectedConversation.clientId,
        conversationContext,
      });

      setMessageText(result.suggestedResponse);
      setIsAISuggested(true);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  // Error state
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <Card variant="default" padding="lg" className="h-full flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-accent-red mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Failed to load messages</h3>
            <p className="text-text-secondary mt-2">
              {error.message || 'Unable to fetch your conversations. Please try again later.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Card variant="default" padding="none" className="h-full flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-background-tertiary flex flex-col">
          <div className="p-4 border-b border-background-tertiary">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-text-secondary">
                <Loader className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-text-secondary">
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-background-secondary transition-colors text-left ${
                    selectedConversation?.id === conv.id ? 'bg-background-secondary' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-medium text-sm">
                      {conv.clientName.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{conv.clientName}</span>
                      <span className="text-xs text-text-tertiary">
                        {conv.latestMessageAt ? new Date(conv.latestMessageAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate">{conv.latestMessage || 'No messages yet'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          {selectedConversation && (
            <div className="p-4 border-b border-background-tertiary flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-medium text-sm">
                  {selectedConversation.clientName.split(' ').slice(0, 2).map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.clientName}</p>
                  <p className="text-sm text-text-secondary">Coach</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" aria-label="Start phone call">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Start video call">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="More options">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-5 h-5 animate-spin" />
              </div>
            ) : messagesError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-accent-red mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">Failed to load messages</p>
                </div>
              </div>
            ) : !messagesData || messagesData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-text-secondary">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messagesData.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${msg.senderRole === 'user' ? 'bg-accent-blue text-white' : 'bg-background-secondary'} ${msg.sending ? 'opacity-70' : ''}`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                        {msg.sending && <Loader className="w-3 h-3 animate-spin" />}
                        {msg.sending ? 'Sending...' : new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-background-tertiary">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" aria-label="Attach file">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  if (isAISuggested) setIsAISuggested(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
                disabled={sendMessageMutation.isPending || aiAssistMutation.isPending}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAIAssist}
                disabled={aiAssistMutation.isPending || !selectedConversation}
                aria-label="Ask AI Coach"
              >
                {aiAssistMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
              <Button onClick={handleSendMessage} disabled={!messageText.trim() || sendMessageMutation.isPending} aria-label="Send message">
                {sendMessageMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {isAISuggested && (
              <div className="mt-2">
                <AIBadge variant="suggested" />
              </div>
            )}
            {aiAssistMutation.isPending && (
              <p className="text-sm text-text-secondary mt-2 flex items-center gap-1">
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing conversation...
              </p>
            )}
            {sendMessageMutation.error && (
              <p className="text-sm text-accent-red mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Failed to send message
              </p>
            )}
            {aiAssistMutation.error && (
              <p className="text-sm text-accent-red mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                AI features temporarily unavailable. Please try again.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
