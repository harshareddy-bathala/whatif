import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function ChatInterface() {
  const conversations = useQuery(api.messages.listConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  const createConversation = useMutation(api.messages.createConversation);
  const addUserMessage = useMutation(api.messages.addUserMessage);
  const deleteConversation = useMutation(api.messages.deleteConversation);
  
  const selectedConversation = useQuery(
    api.messages.getConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);
  
  const handleNewConversation = async () => {
    setIsCreatingConversation(true);
    try {
      const title = `Conversation ${(conversations?.length || 0) + 1}`;
      const conversationId = await createConversation({ title });
      setSelectedConversationId(conversationId);
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create conversation");
    } finally {
      setIsCreatingConversation(false);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedConversationId) return;
    
    const message = inputValue.trim();
    setInputValue("");
    
    try {
      await addUserMessage({
        conversationId: selectedConversationId,
        content: message,
      });
    } catch (error) {
      toast.error("Failed to send message");
      setInputValue(message);
    }
  };
  
  const handleDeleteConversation = async (conversationId: Id<"conversations">) => {
    try {
      await deleteConversation({ conversationId });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };
  
  const isWaitingForResponse = !!(selectedConversation?.messages.length && 
    selectedConversation.messages[selectedConversation.messages.length - 1].role === "user");
  
  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col">
        <button
          onClick={handleNewConversation}
          disabled={isCreatingConversation}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors mb-4 disabled:opacity-50"
        >
          {isCreatingConversation ? "Creating..." : "+ New Conversation"}
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {conversations?.map((conv) => (
            <div
              key={conv._id}
              className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${
                selectedConversationId === conv._id
                  ? "bg-primary text-white"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => setSelectedConversationId(conv._id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv._id);
                  }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ml-2 ${
                    selectedConversationId === conv._id ? "text-white" : "text-red-500"
                  }`}
                >
                  ×
                </button>
              </div>
              <span className="text-xs opacity-75">
                {conv.messages.length} messages
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation?.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">👋 Start the conversation</p>
                    <p className="text-sm">Share your thoughts, plans, or ideas below</p>
                  </div>
                </div>
              ) : (
                selectedConversation?.messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-75 mt-1 block">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
              
              {isWaitingForResponse && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Share your thoughts or plans..."
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  disabled={isWaitingForResponse}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isWaitingForResponse}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">💭 No conversation selected</p>
              <p className="text-sm">Create a new conversation to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
