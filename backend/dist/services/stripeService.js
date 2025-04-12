"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const db_js_1 = require("../db.js");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
class StripeService {
    static async createCustomer(user) {
        try {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id
                }
            });
            await db_js_1.pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, user.id]);
            return customer;
        }
        catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw error;
        }
    }
    static async getOrCreateCustomer(user) {
        const [rows] = await db_js_1.pool.query('SELECT stripe_customer_id FROM users WHERE id = ?', [user.id]);
        if (rows[0]?.stripe_customer_id) {
            return await stripe.customers.retrieve(rows[0].stripe_customer_id);
        }
        return await this.createCustomer(user);
    }
    static async createSubscription(userId, priceId) {
        try {
            const [user] = await db_js_1.pool.query('SELECT * FROM users WHERE id = ?', [userId]);
            if (!user[0])
                throw new Error('User not found');
            const customer = await this.getOrCreateCustomer(user[0]);
            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: priceId }],
                trial_period_days: process.env.TRIAL_PERIOD_DAYS,
                expand: ['latest_invoice.payment_intent']
            });
            await db_js_1.pool.query(`INSERT INTO user_subscriptions 
         (user_id, stripe_subscription_id, status, current_period_end) 
         VALUES (?, ?, ?, FROM_UNIXTIME(?))`, [userId, subscription.id, subscription.status, subscription.current_period_end]);
            return subscription;
        }
        catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }
    static async cancelSubscription(subscriptionId, cancelImmediately = false) {
        try {
            return await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: !cancelImmediately,
                ...(cancelImmediately && { cancel_now: true })
            });
        }
        catch (error) {
            console.error('Error canceling subscription:', error);
            throw error;
        }
    }
}
exports.StripeService = StripeService;
//# sourceMappingURL=stripeService.js.map