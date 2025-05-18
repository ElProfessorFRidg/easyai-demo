'use client'; // This will be a client component

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AIProviderSelector from './AIProviderSelector'; // Import the selector
import { AIProvider, AIProviderConfig, getDefaultProvider } from '@/lib/ai-providers'; // Import types

// Define types for messages and conversation (can be expanded later)
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Conversation {
  id: string;
  messages: Message[];
  title?: string; // Added from Prisma schema
  // Potentially add other conversation metadata here
}

// Type for conversation list items
interface ConversationListItem {
  id: string;
  title?: string;
  updatedAt: string;
  _count?: { messages: number };
}


const ChatInterface: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversationsList, setConversationsList] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProviderConfig>(getDefaultProvider());


  const handleProviderChange = (provider: AIProviderConfig) => {
    setSelectedAIProvider(provider);
    // Potentially, you might want to store this preference (e.g., in localStorage or backend)
    // or clear the current chat if the provider change implies a context reset.
    console.log("AI Provider changed to:", provider.name);
  };

  // Fetch all conversations for the user
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingHistory(true);
      setError(null);
      try {
        const response = await fetch('/api/conversations');
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversationsList(data.conversations || []);
        // Automatically select the first conversation if available, or none
        if (data.conversations && data.conversations.length > 0) {
          // For now, let's not auto-select, let user click or have a "new chat" state
          // setSelectedConversationId(data.conversations[0].id);
        } else {
          // Start with a new, unsaved conversation state if no history
          setActiveConversation({ id: 'new-chat', messages: [] });
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch conversations list:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchConversations();
  }, []);

  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId || selectedConversationId === 'new-chat') {
      if (selectedConversationId === 'new-chat') {
         setActiveConversation({ id: 'new-chat', messages: [] });
      }
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true); // Loading messages for the selected conversation
      setError(null);
      try {
        const response = await fetch(`/api/conversations/${selectedConversationId}/messages`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages for the conversation');
        }
        const data = await response.json();
        // TODO: Decrypt messages if they come encrypted from API
        const fetchedMessages: Message[] = (data.messages || []).map((msg: any) => ({
            ...msg,
            text: msg.text ?? msg.content ?? '', // Prend 'text' si dispo, sinon 'content'
            sender: (msg.sender || '').toLowerCase(), // Normalise en 'user' ou 'ai'
            timestamp: new Date(msg.timestamp) // Ensure timestamp is a Date object
        }));
        const currentConvoDetails = conversationsList.find(c => c.id === selectedConversationId);
        setActiveConversation({
          id: selectedConversationId,
          title: currentConvoDetails?.title,
          messages: fetchedMessages,
        });
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch messages:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversationId, conversationsList]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`, // Temporary ID for optimistic update
      text: currentMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    // Optimistic UI update
    setActiveConversation((prevConvo) => {
      if (!prevConvo) return { id: 'new-chat', messages: [userMessage] }; // Should not happen if new-chat is default
      return {
        ...prevConvo,
        messages: [...prevConvo.messages, userMessage],
      };
    });
    const messageToSend = currentMessage;
    setCurrentMessage('');

    console.log('[ChatInterface] Sending message:', {
      content: messageToSend,
      providerId: selectedAIProvider.id,
      conversationId: activeConversation?.id !== 'new-chat' ? activeConversation?.id : 'new',
      currentMessagesInState: activeConversation?.messages.length
    });

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation?.id !== 'new-chat' ? activeConversation?.id : undefined,
          content: messageToSend,
          aiProvider: selectedAIProvider.id, // Pass the selected provider ID
        }),
      });

      if (!response.ok) {
        // Attempt to parse error from API
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not JSON
        }
        throw new Error(errorData?.error || `API Error: ${response.statusText} (Status: ${response.status})`);
      }

      // const data = await response.json(); // This line was duplicated

      const data = await response.json(); // API returns { userMessage, aiMessage, conversation? }
      console.log('[ChatInterface] Received data from /api/messages:', data);

      // If a new conversation was created by the API, update its ID and refresh conversations list.
      // The main state update for messages will be handled by the refetch in the finally block.
      if (data.conversation && data.conversation.id && (activeConversation?.id === 'new-chat' || !selectedConversationId || selectedConversationId === 'new-chat')) {
        console.log(`[ChatInterface] New conversation created/updated by API, ID: ${data.conversation.id}. Selecting it.`);
        
        // Add to conversationsList or update it
        const newConvoListItem: ConversationListItem = {
            id: data.conversation.id,
            title: data.conversation.title,
            updatedAt: data.conversation.updatedAt,
            _count: { messages: (data.userMessage ? 1 : 0) + (data.aiMessage ? 1 : 0) } // Initial count
        };

        setConversationsList(prevList => {
            const existingIndex = prevList.findIndex(c => c.id === newConvoListItem.id);
            if (existingIndex !== -1) {
                const updatedList = [...prevList];
                updatedList[existingIndex] = { ...updatedList[existingIndex], ...newConvoListItem};
                return updatedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            }
            return [newConvoListItem, ...prevList].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
        setSelectedConversationId(data.conversation.id); // Select the new/updated conversation
      } else if (activeConversation && activeConversation.id !== 'new-chat' && data.conversation) {
        // If it's an existing conversation and title/updatedAt might have changed
         setConversationsList(prevList => prevList.map(c => c.id === data.conversation.id ? {...c, title: data.conversation.title, updatedAt: data.conversation.updatedAt } : c ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      }
      // The `finally` block will now be responsible for fetching the definitive message list.

    } catch (err: any) {
      console.error('[ChatInterface] Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      // Revert optimistic update on error
      setActiveConversation(prev => {
        if (!prev) return null;
        // Remove the optimistic user message
        const revertedMessages = prev.messages.filter(msg => msg.id !== userMessage.id);
        return {
          ...prev,
          messages: revertedMessages
        };
      });
    } finally {
      setIsLoading(false);
      // Force refetch of messages for the current (possibly new) conversation to ensure consistency.
      // This is critical after optimistic updates and API responses.
      
      // selectedConversationId should have been updated in the `try` block if a new conversation was created.
      // activeConversation.id would also reflect this.
      const idToRefresh = selectedConversationId || activeConversation?.id;

      // console.log(`[ChatInterface] Finally block. ID to refresh: ${idToRefresh}`);

      if (idToRefresh && idToRefresh !== 'new-chat') {
        // console.log(`[ChatInterface] Forcing refetch for conversation ID: ${idToRefresh}`);
        setTimeout(() => {
          // Re-setting the same ID will trigger the useEffect hook that fetches messages.
          setSelectedConversationId(idToRefresh);
        }, 50); // Small delay to allow other state updates to process.
      } else if (idToRefresh === 'new-chat' && activeConversation?.id === 'new-chat') {
        // This means it's still a new chat, nothing was saved by the API, or the API call failed.
        // The optimistic message might still be there or cleared by error handling.
        // No specific refetch needed for 'new-chat' unless an error occurred and we want to clear.
        // console.log('[ChatInterface] Still in new-chat state after API call.');
      }
    }
  };

  const handleSelectConversation = (convoId: string) => {
    if (convoId === selectedConversationId) return; // Avoid re-fetching if already selected
    setSelectedConversationId(convoId);
    if (convoId === 'new-chat') {
        setActiveConversation({ id: 'new-chat', messages: [] });
    }
  };

  // Debug: log duplicate message IDs before rendering
  if (activeConversation?.messages) {
    const ids = activeConversation.messages.map(m => m.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      console.warn('[ChatInterface] Duplicate message IDs detected:', duplicates);
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] max-w-5xl mx-auto border rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* Conversations Sidebar */}
      <div className="w-1/4 border-r overflow-y-auto dark:border-gray-700 dark:bg-gray-900">
        <div className="p-4 border-b dark:border-gray-700">
          <Button onClick={() => handleSelectConversation('new-chat')} variant="primary" size="sm" className="w-full dark:hover:bg-blue-700">
            New Chat
          </Button>
        </div>
        <div className="p-2 space-y-1">
          {isLoadingHistory && <p className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading chats...</p>}
          {conversationsList.map((convo) => (
            <button
              key={convo.id}
              onClick={() => handleSelectConversation(convo.id)}
              className={`w-full text-left p-2 rounded-md text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 ${
                selectedConversationId === convo.id ? 'bg-gray-200 font-semibold dark:bg-gray-700 dark:text-white' : 'dark:text-gray-400'
              }`}
            >
              {convo.title || `Chat from ${new Date(convo.updatedAt).toLocaleDateString()}`}
              {convo._count && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({convo._count.messages})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-850 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold dark:text-gray-200">
            {activeConversation?.title || (activeConversation?.id === 'new-chat' ? 'New Chat' : 'Chat')}
          </h2>
          <AIProviderSelector
            initialProviderId={selectedAIProvider.id}
            onProviderChange={handleProviderChange}
            className="w-48" // Adjust width as needed
          />
        </div>

        {/* Message Display Area */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-850">
          {error && <div className="text-red-500 p-2 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">{error}</div>}
          {[...(activeConversation?.messages || [])]
            .filter((msg, idx, arr) => arr.findIndex(m => m.id === msg.id) === idx)
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white'
                      : 'bg-gray-100 text-gray-800 border dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-opacity-75 dark:text-opacity-75 dark:text-gray-400 mt-1 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
          ))}
          {isLoading && activeConversation?.messages.length === 0 && selectedConversationId !== 'new-chat' && (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading messages...</div>
          )}
          {!isLoading && !activeConversation?.messages.length && selectedConversationId && selectedConversationId !== 'new-chat' && (
            <div className="text-center text-gray-500 dark:text-gray-400">No messages in this conversation yet.</div>
          )}
          {!selectedConversationId && !isLoadingHistory && conversationsList.length > 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-10">Select a conversation to start chatting or create a new one.</div>
          )}
           {!selectedConversationId && !isLoadingHistory && conversationsList.length === 0 && activeConversation?.id !== 'new-chat' && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-10">No past conversations. Start a new chat!</div>
          )}
        </div>

        {/* Message Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-100 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-500 dark:text-gray-200"
            disabled={isLoading}
          />
          <Button type="submit" isLoading={isLoading} disabled={!currentMessage.trim()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
            Send
          </Button>
        </div>
      </form>
    </div> {/* This closes the flex-1 flex flex-col div */}
  </div> // This closes the main component wrapper div
  );
};

export default ChatInterface;