import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// This function generates an upload URL and stores metadata about the audio
export const uploadAudio = mutation({
  args: {
    title: v.string(),
    contentType: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    
    if (!user) {
      throw new ConvexError("User not found");
    }
    
    // Check if the user has enough tokens
    const currentTokens = user.tokens || 0;
    if (currentTokens < 1) {
      throw new ConvexError("Not enough tokens to create a post");
    }
    
    // Generate a storage upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();
    
    return { 
      uploadUrl,
      userId: user.userId,
      userName: user.name || "Anonymous",
      userImage: user.image,
      userDocId: user._id,
      currentTokens
    };
  },
});

// Save the post after the file has been uploaded
export const savePost = mutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
    duration: v.number(),
    userId: v.string(),
    userName: v.string(),
    userImage: v.optional(v.string()),
    userDocId: v.id("users"),
    currentTokens: v.number(),
  },
  handler: async (ctx, args) => {
    // Create the post
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      audioUrl: args.storageId,
      duration: args.duration,
      createdAt: new Date().toISOString(),
      userId: args.userId,
      userName: args.userName,
      userImage: args.userImage,
    });
    
    // Deduct a token from the user
    await ctx.db.patch(args.userDocId, {
      tokens: args.currentTokens - 1,
    });
    
    // Return the new post ID and updated token balance
    return {
      postId,
      newTokenBalance: args.currentTokens - 1,
    };
  },
});

// Get all posts, sorted by creation time (newest first)
export const getAllPosts = query({
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    return posts;
  },
});

// Get a single post by ID
export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }
    return post;
  },
});

// Get the audio file URL for a post
export const getAudioUrl = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }
    
    // Generate a URL for the audio file
    const storageId = post.audioUrl as Id<"_storage">;
    const audioUrl = await ctx.storage.getUrl(storageId);
    return audioUrl;
  },
});
