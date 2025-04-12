"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const db_js_1 = require("../db.js");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
class SubscriptionService {
    static async getUserSubscription(userId) {
        const [subscription] = await db_js_1.pool.query(`SELECT us.*, sp.* 
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active'
       ORDER BY us.created_at DESC LIMIT 1`, [userId]);
        return subscription[0];
    }
    static async checkSeatAvailability(userId) {
        const [result] = await db_js_1.pool.query(`SELECT 
        sp.seat_limit,
        COUNT(d.id) as seats_used
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       LEFT JOIN devices d ON d.user_id = us.user_id AND d.is_active = TRUE
       WHERE us.user_id = ? AND us.status = 'active'
       GROUP BY us.id`, [userId]);
        if (!result.length)
            return { hasSubscription: false };
        return {
            hasSubscription: true,
            seatLimit: result[0].seat_limit,
            seatsUsed: result[0].seats_used,
            seatsAvailable: result[0].seat_limit - result[0].seats_used
        };
    }
    static async createSubscription(userId, planId, paymentMethodId) {
        const conn = await db_js_1.pool.getConnection();
        try {
            await conn.beginTransaction();
            // Get user details
            const [user] = await conn.query('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user[0]) {
                throw new Error('User not found');
            }
            // Get stripe customer ID
            const [stripeCustomer] = await conn.query('SELECT stripe_customer_id FROM users WHERE user_id = ?', [userId]);
            let customerId = stripeCustomer[0]?.stripe_customer_id;
            if (!customerId) {
                console.log('Creating new Stripe customer...');
                const customer = await stripe.customers.create({
                    email: user[0].email,
                    payment_method: paymentMethodId,
                    invoice_settings: { default_payment_method: paymentMethodId }
                });
                customerId = customer.id;
                await conn.query('UPDATE users SET stripe_customer_id = ? WHERE user_id = ?', [customerId, userId]);
            }
            console.log('Creating Stripe subscription...');
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: planId }],
                payment_settings: {
                    payment_method_types: ['card'],
                    save_default_payment_method: 'on_subscription'
                },
                expand: ['latest_invoice.payment_intent']
            });
            await conn.commit();
            return subscription;
        }
        catch (error) {
            await conn.rollback();
            console.error('Subscription creation error:', error);
            throw error;
        }
        finally {
            conn.release();
        }
    }
    static async cancelSubscription(userId, cancelImmediately = false) {
        const conn = await db_js_1.pool.getConnection();
        try {
            // Get current subscription
            const [subscription] = await conn.query('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = "active" LIMIT 1', [userId]);
            if (!subscription) {
                throw new Error('No active subscription found');
            }
            if (cancelImmediately) {
                // Cancel immediately in Stripe
                await stripe.subscriptions.cancel(subscription.provider_subscription_id);
                // Update local database
                await conn.query('UPDATE user_subscriptions SET status = "cancelled", updated_at = NOW() WHERE id = ?', [subscription.id]);
            }
            else {
                // Cancel at period end in Stripe
                await stripe.subscriptions.update(subscription.provider_subscription_id, {
                    cancel_at_period_end: true
                });
                // Update local database
                await conn.query('UPDATE user_subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE id = ?', [subscription.id]);
            }
            return { success: true };
        }
        finally {
            conn.release();
        }
    }
    static async getSubscriptionPlans() {
        const [plans] = await db_js_1.pool.query('SELECT * FROM subscription_plans WHERE is_active = true');
        return plans;
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=subscriptionService.js.map