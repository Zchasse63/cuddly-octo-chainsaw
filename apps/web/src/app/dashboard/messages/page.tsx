'use client';

import { useState } from 'react';
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
  Check,
  CheckCheck,
} from 'lucide-react';

const mockConversations = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    avatar: 'SM',
    lastMessage: 'Thanks for the program update!',
    time: '2 min ago',
    unread: 2,
    online: true,
  },
  {
    id: '2',
    name: 'Mike Rodriguez',
    avatar: 'MR',
    lastMessage: 'I hit a new PR today! 225 on bench',
    time: '15 min ago',
    unread: 0,
    online: true,
  },
  {
    id: '3',
    name: 'Emily Kim',
    avatar: 'EK',
    lastMessage: 'What time is our call tomorrow?',
    time: '1 hour ago',
    unread: 1,
    online: false,
  },
  {
    id: '4',
    name: 'James Thompson',
    avatar: 'JT',
    lastMessage: 'My knee is feeling much better now',
    time: '3 hours ago',
    unread: 0,
    online: false,
  },
  {
    id: '5',
    name: 'Lisa Wang',
    avatar: 'LW',
    lastMessage: 'Can we adjust the cardio portion?',
    time: 'Yesterday',
    unread: 0,
    online: true,
  },
];

const mockMessages = [
  {
    id: '1',
    sender: 'them',
    text: 'Hey coach! Just finished my morning workout',
    time: '9:30 AM',
    status: 'read',
  },
  {
    id: '2',
    sender: 'me',
    text: 'Great job Sarah! How did the new squat progression feel?',
    time: '9:32 AM',
    status: 'read',
  },
  {
    id: '3',
    sender: 'them',
    text: 'It was challenging but I managed all the sets! The 5lb increase was perfect',
    time: '9:35 AM',
    status: 'read',
  },
  {
    id: '4',
    sender: 'me',
    text: "That's exactly what we want to hear. Let's keep this momentum going. Remember to focus on your recovery today - get that sleep!",
    time: '9:38 AM',
    status: 'read',
  },
  {
    id: '5',
    sender: 'them',
    text: 'Thanks for the program update!',
    time: '10:15 AM',
    status: 'delivered',
  },
];

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = mockConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Would send message via tRPC
      setMessageText('');
    }
  };

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
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-background-secondary transition-colors text-left ${
                  selectedConversation.id === conv.id ? 'bg-background-secondary' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-medium">
                    {conv.avatar}
                  </div>
                  {conv.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-accent-green rounded-full border-2 border-background-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{conv.name}</span>
                    <span className="text-xs text-text-tertiary">{conv.time}</span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-accent-blue rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-background-tertiary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-medium">
                  {selectedConversation.avatar}
                </div>
                {selectedConversation.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-background-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">{selectedConversation.name}</p>
                <p className="text-sm text-text-secondary">
                  {selectedConversation.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-2xl ${
                    message.sender === 'me'
                      ? 'bg-accent-blue text-white rounded-br-md'
                      : 'bg-background-secondary rounded-bl-md'
                  }`}
                >
                  <p>{message.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 ${
                      message.sender === 'me' ? 'text-white/70' : 'text-text-tertiary'
                    }`}
                  >
                    <span className="text-xs">{message.time}</span>
                    {message.sender === 'me' && (
                      message.status === 'read' ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-background-tertiary">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
