import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get the current user's token balance
export const getUserTokens = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    return {
      tokens: user.tokens || 0,
    };
  },
});

// Add a token to a user's account
export const addToken = mutation({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`=== Adding token to user ${args.tokenIdentifier} ===`);

    try {
      // Get the user
      console.log(`Looking up user with tokenIdentifier: ${args.tokenIdentifier}`);
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
        .unique();

      console.log(`User lookup result:`, user ? `Found user ${user._id}` : 'User not found');

      if (!user) {
        console.error(`User not found with tokenIdentifier: ${args.tokenIdentifier}`);
        return { success: false, error: "User not found" };
      }

      // Update the user's token balance
      const currentTokens = user.tokens || 0;
      const newTokens = currentTokens + 1;

      console.log(`Updating user ${user._id} tokens from ${currentTokens} to ${newTokens}`);

      await ctx.db.patch(user._id, {
        tokens: newTokens,
      });

      console.log(`Successfully updated user ${user._id} tokens to ${newTokens}`);

      return {
        success: true,
        newBalance: newTokens,
      };
    } catch (error) {
      console.error(`Error adding token to user ${args.tokenIdentifier}:`, error);
      return { success: false, error: String(error) };
    }
  },
});

// Use a token to create a post
export const useToken = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user has enough tokens
    const currentTokens = user.tokens || 0;
    if (currentTokens < 1) {
      throw new Error("Not enough tokens");
    }

    // Deduct tokens from the user's balance
    const newTokens = currentTokens - 1;
    await ctx.db.patch(user._id, {
      tokens: newTokens,
    });

    return {
      success: true,
      newBalance: newTokens,
    };
  },
});
