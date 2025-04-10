import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
    action,
    httpAction,
    mutation,
    query
} from "./_generated/server";

const createCheckout = async ({
    customerEmail,
    priceId,
    successUrl,
    metadata,
    customAmount
}: {
    customerEmail: string;
    priceId: string;
    successUrl: string;
    metadata?: Record<string, string>;
    customAmount?: number;
}) => {
    if (!process.env.POLAR_ACCESS_TOKEN) {
        throw new Error("POLAR_ACCESS_TOKEN is not configured");
    }

    const polar = new Polar({
        server: "sandbox",
        accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

    // Default app URL if environment variable is not set or invalid
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Ensure successUrl is an absolute URL
    let absoluteSuccessUrl;
    if (successUrl.startsWith('http')) {
        absoluteSuccessUrl = successUrl;
    } else {
        // Add leading slash if needed
        const path = successUrl.startsWith('/') ? successUrl : `/${successUrl}`;
        absoluteSuccessUrl = `${appUrl}${path}`;
    }

    console.log("Using success URL:", absoluteSuccessUrl);

    // Create checkout options
    const checkoutOptions: any = {
        productPriceId: priceId,
        successUrl: absoluteSuccessUrl,
        customerEmail,
        metadata,
    };

    // Add custom amount if provided
    if (customAmount !== undefined) {
        console.log(`Setting custom amount: ${customAmount} cents`);
        checkoutOptions.amount = customAmount;
    }

    console.log("Creating checkout with options:", checkoutOptions);
    const result = await polar.checkouts.custom.create(checkoutOptions);

    return result;
};

export const getProOnboardingCheckoutUrl = action({
    args: {
        priceId: v.string(),
        successUrl: v.optional(v.string()),
        customAmount: v.optional(v.number()),
        tokenQuantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const metadata = {
            userId: identity.subject,
            userEmail: identity.email,
            tokenIdentifier: identity.subject,
            tokenQuantity: args.tokenQuantity ? String(args.tokenQuantity) : "1", // Store token quantity in metadata
        };

        // Ensure we have a valid app URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        console.log("App URL:", appUrl);

        // Default to localhost:3000 if not set
        const baseUrl = appUrl && appUrl.startsWith('http')
            ? appUrl
            : 'http://localhost:3000';

        console.log(`Creating checkout with priceId: ${args.priceId}, customAmount: ${args.customAmount}`);

        const checkout = await createCheckout({
            customerEmail: identity.email!,
            priceId: args.priceId,
            successUrl: args.successUrl || baseUrl, // Use provided successUrl or default to baseUrl
            metadata: metadata as Record<string, string>,
            customAmount: args.customAmount // Pass the custom amount directly
        });

        return checkout.url;
    },
});

export const getUserSubscriptionStatus = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return { hasActiveSubscription: false };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (!user) {
            return { hasActiveSubscription: false };
        }

        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
            .first();

        const hasActiveSubscription = subscription?.status === "active";
        return { hasActiveSubscription };
    }
});

export const getUserSubscription = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (!user) {
            return null;
        }

        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
            .first();

        return subscription;
    }
});

export const subscriptionStoreWebhook = mutation({
    args: {
        body: v.any(),
    },
    handler: async (ctx, args) => {

        // Extract event type from webhook payload
        const eventType = args.body.type;

        // Store webhook event
        await ctx.db.insert("webhookEvents", {
            type: eventType,
            polarEventId: args.body.data.id,
            createdAt: args.body.data.created_at,
            modifiedAt: args.body.data.modified_at || args.body.data.created_at,
            data: args.body.data,
        });

        switch (eventType) {
            case 'subscription.created':

                // Insert new subscription
                await ctx.db.insert("subscriptions", {
                    polarId: args.body.data.id,
                    polarPriceId: args.body.data.price_id,
                    currency: args.body.data.currency,
                    interval: args.body.data.recurring_interval,
                    userId: args.body.data.metadata.userId,
                    status: args.body.data.status,
                    currentPeriodStart: new Date(args.body.data.current_period_start).getTime(),
                    currentPeriodEnd: new Date(args.body.data.current_period_end).getTime(),
                    cancelAtPeriodEnd: args.body.data.cancel_at_period_end,
                    amount: args.body.data.amount,
                    startedAt: new Date(args.body.data.started_at).getTime(),
                    endedAt: args.body.data.ended_at
                        ? new Date(args.body.data.ended_at).getTime()
                        : undefined,
                    canceledAt: args.body.data.canceled_at
                        ? new Date(args.body.data.canceled_at).getTime()
                        : undefined,
                    customerCancellationReason: args.body.data.customer_cancellation_reason || undefined,
                    customerCancellationComment: args.body.data.customer_cancellation_comment || undefined,
                    metadata: args.body.data.metadata || {},
                    customFieldData: args.body.data.custom_field_data || {},
                    customerId: args.body.data.customer_id
                });
                break;

            case 'subscription.updated':
                // Find existing subscription
                const existingSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (existingSub) {
                    await ctx.db.patch(existingSub._id, {
                        amount: args.body.data.amount,
                        status: args.body.data.status,
                        currentPeriodStart: new Date(args.body.data.current_period_start).getTime(),
                        currentPeriodEnd: new Date(args.body.data.current_period_end).getTime(),
                        cancelAtPeriodEnd: args.body.data.cancel_at_period_end,
                        metadata: args.body.data.metadata || {},
                        customFieldData: args.body.data.custom_field_data || {},
                    });
                }
                break;

            case 'subscription.active':
                // Find and update subscription
                const activeSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (activeSub) {
                    await ctx.db.patch(activeSub._id, {
                        status: args.body.data.status,
                        startedAt: new Date(args.body.data.started_at).getTime(),
                    });
                }
                break;

            case 'subscription.canceled':
                // Find and update subscription
                const canceledSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (canceledSub) {
                    await ctx.db.patch(canceledSub._id, {
                        status: args.body.data.status,
                        canceledAt: args.body.data.canceled_at
                            ? new Date(args.body.data.canceled_at).getTime()
                            : undefined,
                        customerCancellationReason: args.body.data.customer_cancellation_reason || undefined,
                        customerCancellationComment: args.body.data.customer_cancellation_comment || undefined,
                    });
                }
                break;

            case 'subscription.uncanceled':
                // Find and update subscription
                const uncanceledSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (uncanceledSub) {
                    await ctx.db.patch(uncanceledSub._id, {
                        status: args.body.data.status,
                        cancelAtPeriodEnd: false,
                        canceledAt: undefined,
                        customerCancellationReason: undefined,
                        customerCancellationComment: undefined,
                    });
                }
                break;

            case 'subscription.revoked':
                // Find and update subscription
                const revokedSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (revokedSub) {
                    await ctx.db.patch(revokedSub._id, {
                        status: 'revoked',
                        endedAt: args.body.data.ended_at
                            ? new Date(args.body.data.ended_at).getTime()
                            : undefined,
                    });
                }
                break;

            case 'order.created':
            case 'order.paid':
                console.log(`${eventType} event received:`, JSON.stringify(args.body, null, 2));

                // For order.paid, we need to check the product name in a different way
                let productName = '';
                if (eventType === 'order.paid') {
                    // For order.paid, the product name is in items[0].label
                    productName = args.body.data.items?.[0]?.label?.toLowerCase() || '';
                    console.log("Product label from items:", productName);
                } else {
                    // For order.created, the product name is directly in data
                    productName = args.body.data.product_name?.toLowerCase() || '';
                    console.log("Product name from data:", productName);
                }

                console.log("Metadata:", JSON.stringify(args.body.data.metadata, null, 2));
                console.log("Is token purchase:", productName.includes('token') || productName.includes('audio token'));

                if (productName.includes('token') || productName.includes('audio token')) {
                    // This is a token purchase, process it
                    try {
                        // Extract token amount from product name (e.g., "1 Audio Token" -> 1)
                        const tokenMatch = productName.match(/^(\d+)\s+/); // Match digits at start
                        const tokenAmount = tokenMatch ? parseInt(tokenMatch[1], 10) : 1; // Default to 1 if not found
                        console.log("Token amount extracted:", tokenAmount);

                        // Check if we have the user's tokenIdentifier
                        console.log("Has tokenIdentifier:", !!args.body.data.metadata?.tokenIdentifier);
                        if (!args.body.data.metadata?.tokenIdentifier) {
                            console.error('Missing tokenIdentifier in metadata for token purchase');
                            break;
                        }

                        console.log("About to add token for user:", args.body.data.metadata.tokenIdentifier);
                        // Get token quantity from metadata or calculate from payment amount
                        let tokenQuantity = 1;
                        const paymentAmount = args.body.data.amount || 0;
                        const paymentAmountDollars = paymentAmount / 100;

                        // Log the full payment details for debugging
                        console.log('Payment details:', {
                            amount: paymentAmount,
                            amountDollars: paymentAmountDollars,
                            metadata: args.body.data.metadata,
                            items: args.body.data.items
                        });

                        // First check if tokenQuantity is in metadata
                        if (args.body.data.metadata?.tokenQuantity) {
                            tokenQuantity = parseInt(args.body.data.metadata.tokenQuantity, 10);
                            console.log(`Using token quantity from metadata: ${tokenQuantity}`);
                        } else {
                            // Otherwise calculate based on payment amount (1 token = $1)
                            // Payment amount is in cents, so divide by 100 to get dollars
                            tokenQuantity = Math.max(1, Math.round(paymentAmountDollars));
                            console.log(`Calculated token quantity from payment amount: ${tokenQuantity}`);
                        }

                        console.log(`Adding ${tokenQuantity} tokens for payment of $${paymentAmountDollars.toFixed(2)}`);

                        // Add tokens to the user
                        const result = await ctx.runMutation(api.tokens.addToken, {
                            tokenIdentifier: args.body.data.metadata.tokenIdentifier,
                            quantity: tokenQuantity
                        });

                        console.log(`Added token for user ${args.body.data.metadata.tokenIdentifier}, result:`, JSON.stringify(result, null, 2));
                    } catch (error) {
                        console.error("Error processing token purchase:", error);
                    }
                }
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
                break;
        }
    },
});

export const paymentWebhook = httpAction(async (ctx, request) => {
    console.log("Payment webhook received");

    try {
        const body = await request.json();
        console.log("Webhook body:", JSON.stringify({
            type: body.type,
            id: body.data?.id,
            product: body.data?.product_name,
            metadata: body.data?.metadata
        }, null, 2));

        // track events and based on events store data
        console.log("About to run subscriptionStoreWebhook mutation");
        await ctx.runMutation(api.subscriptions.subscriptionStoreWebhook, {
            body
        });
        console.log("subscriptionStoreWebhook mutation completed");

        return new Response(JSON.stringify({ message: "Webhook received!" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

});

export const getUserDashboardUrl = action({
    handler: async (_ctx, args: { customerId: string }) => {
        const polar = new Polar({
            server: "sandbox",
            accessToken: process.env.POLAR_ACCESS_TOKEN,
        });

        try {
            const result = await polar.customerSessions.create({
                customerId: args.customerId,
            });

            // Only return the URL to avoid Convex type issues
            return { url: result.customerPortalUrl };
        } catch (error) {
            console.error("Error creating customer session:", error);
            throw new Error("Failed to create customer session");
        }
    }
});
