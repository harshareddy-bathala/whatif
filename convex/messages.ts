import { v } from "convex/values";
import { query, mutation, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

// Get all conversations for the logged-in user
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return conversations;
  },
});

// Get a specific conversation
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }
    
    return conversation;
  },
});

// Create a new conversation
export const createConversation = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const conversationId = await ctx.db.insert("conversations", {
      userId,
      messages: [],
      title: args.title,
    });
    
    return conversationId;
  },
});

// Add a user message to a conversation
export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }
    
    const newMessage = {
      role: "user" as const,
      content: args.content,
      timestamp: Date.now(),
    };
    
    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, newMessage],
    });
    
    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      conversationId: args.conversationId,
    });
    
    return null;
  },
});

// Generate AI response (internal action)
export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.runQuery(internal.messages.getConversationInternal, {
      conversationId: args.conversationId,
    });
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    const systemPrompt = `You are a thoughtful "Devil's Advocate" assistant. Your role is to provide alternative perspectives, potential challenges, and considerations that the user might not have thought about.

Your approach should be:
1. Polite and respectful - never condescending or dismissive
2. Balanced - acknowledge the positives while exploring the negatives
3. Specific and practical - provide concrete examples and scenarios
4. Constructive - help the user make more informed decisions
5. Empathetic - understand their perspective before offering counterpoints

When responding:
- Start by acknowledging their idea or plan
- Present potential challenges, risks, or downsides
- Use phrases like "Have you considered...", "One thing to think about...", "A potential challenge might be..."
- Provide realistic scenarios and examples
- End with a balanced perspective that helps them think more deeply

Remember: You're not trying to discourage them, but to help them see the full picture and make better-informed decisions.`;
    
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversation.messages.map((msg: { role: "user" | "assistant"; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const assistantMessage = response.choices[0].message.content;
    if (!assistantMessage) {
      throw new Error("No response from AI");
    }
    
    await ctx.runMutation(internal.messages.addAssistantMessage, {
      conversationId: args.conversationId,
      content: assistantMessage,
    });
    
    return null;
  },
});

// Internal query to get conversation (bypasses auth for scheduled functions)
export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// Internal mutation to add assistant message
export const addAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    const newMessage = {
      role: "assistant" as const,
      content: args.content,
      timestamp: Date.now(),
    };
    
    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, newMessage],
    });
    
    return null;
  },
});

// Delete a conversation
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }
    
    await ctx.db.delete(args.conversationId);
    return null;
  },
});
