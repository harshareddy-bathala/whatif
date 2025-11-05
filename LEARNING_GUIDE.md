# Devil's Advocate Chatbot - Backend Learning Guide

## 🎯 What You've Built

A full-stack chatbot application that provides thoughtful counterpoints and alternative perspectives to user inputs. The backend uses Convex for real-time data management and OpenAI for AI responses.

---

## 📚 Backend Concepts Explained

### 1. **Database Schema** (`convex/schema.ts`)

The schema defines the structure of your data:

```typescript
conversations: defineTable({
  userId: v.id("users"),           // Links conversation to a user
  messages: v.array(                // Array of message objects
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })
  ),
  title: v.string(),
}).index("by_user", ["userId"])     // Index for fast user lookups
```

**Key Concepts:**
- **Tables**: Like database tables, store collections of documents
- **Validators**: Define data types (v.string(), v.number(), v.id(), etc.)
- **Indexes**: Speed up queries by creating fast lookup paths

---

### 2. **Queries** (Read Data)

Queries fetch data from the database. They're **reactive** - the UI automatically updates when data changes.

```typescript
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return conversations;
  },
});
```

**Key Concepts:**
- `ctx.db.query()`: Start a database query
- `.withIndex()`: Use an index for efficient filtering
- `.order()`: Sort results (asc/desc)
- `.collect()`: Get all results as an array

---

### 3. **Mutations** (Write Data)

Mutations modify database data. They're **transactional** - either all changes succeed or none do.

```typescript
export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    
    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, newMessage],
    });
    
    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      conversationId: args.conversationId,
    });
  },
});
```

**Key Concepts:**
- `ctx.db.get()`: Fetch a document by ID
- `ctx.db.patch()`: Update specific fields
- `ctx.db.insert()`: Create new document
- `ctx.db.delete()`: Remove document
- `ctx.scheduler.runAfter()`: Schedule future function execution

---

### 4. **Actions** (External API Calls)

Actions can call external APIs (like OpenAI) but can't directly access the database.

```typescript
export const generateResponse = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Call query to get data
    const conversation = await ctx.runQuery(
      internal.messages.getConversationInternal,
      { conversationId: args.conversationId }
    );
    
    // Call external API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    
    // Call mutation to save result
    await ctx.runMutation(internal.messages.addAssistantMessage, {
      conversationId: args.conversationId,
      content: assistantMessage,
    });
  },
});
```

**Key Concepts:**
- Actions run in a Node.js environment (can use any npm package)
- Use `ctx.runQuery()` and `ctx.runMutation()` to interact with database
- Perfect for API calls, file processing, sending emails, etc.

---

### 5. **Authentication**

The template uses Convex Auth for user management:

```typescript
const userId = await getAuthUserId(ctx);
if (!userId) {
  throw new Error("Not authenticated");
}
```

**Key Concepts:**
- `getAuthUserId()`: Get current logged-in user's ID
- Always check authentication in sensitive functions
- User data stored in the `users` table

---

### 6. **Internal vs Public Functions**

```typescript
// Public - can be called from frontend
export const listConversations = query({ ... });

// Internal - only callable from other backend functions
export const getConversationInternal = internalQuery({ ... });
```

**Key Concepts:**
- Public functions: Use `query`, `mutation`, `action`
- Internal functions: Use `internalQuery`, `internalMutation`, `internalAction`
- Internal functions bypass auth checks (use carefully!)

---

## 🔧 How Data Flows

1. **User sends message** → Frontend calls `addUserMessage` mutation
2. **Mutation saves message** → Updates database with user's message
3. **Mutation schedules action** → Triggers `generateResponse` action
4. **Action fetches conversation** → Calls internal query to get messages
5. **Action calls OpenAI** → Gets AI response
6. **Action saves response** → Calls internal mutation to add AI message
7. **Frontend updates** → React component automatically re-renders with new message

---

## 🎓 Learning Path

### Beginner Level
1. **Understand the schema** - How data is structured
2. **Read queries** - How to fetch data
3. **Write mutations** - How to modify data
4. **Test with console.log** - Add logging to understand flow

### Intermediate Level
1. **Indexes** - Optimize query performance
2. **Validators** - Ensure data integrity
3. **Error handling** - Handle edge cases gracefully
4. **Scheduling** - Delayed and recurring tasks

### Advanced Level
1. **Actions** - External API integration
2. **File storage** - Handle images/documents
3. **HTTP endpoints** - Create REST APIs
4. **Search** - Full-text search implementation

---

## 🛠️ Customization Ideas

### Easy
- Change AI personality in the system prompt
- Add conversation titles based on first message
- Add timestamps to messages
- Add message editing/deletion

### Medium
- Add conversation search
- Export conversations as PDF
- Add message reactions (👍/👎)
- Implement conversation sharing

### Advanced
- Add voice input/output
- Multi-language support
- Conversation analytics
- Custom AI models per conversation

---

## 📖 Resources

- **Convex Docs**: https://docs.convex.dev
- **Convex Discord**: Join for help and community
- **OpenAI API Docs**: https://platform.openai.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

---

## 🐛 Debugging Tips

1. **Check Convex Dashboard**: View logs and data in real-time
2. **Use console.log**: Add logging in backend functions
3. **Check Network Tab**: See API calls in browser DevTools
4. **Read Error Messages**: They usually point to the exact issue
5. **Test incrementally**: Make small changes and test often

---

## 💡 Next Steps

1. **Experiment**: Modify the system prompt to change AI behavior
2. **Add features**: Pick one customization idea and implement it
3. **Read code**: Understand every line in `convex/messages.ts`
4. **Build something new**: Apply these concepts to your own project

Good luck with your learning journey! 🚀
