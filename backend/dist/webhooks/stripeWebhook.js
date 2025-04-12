"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = handleStripeWebhook;
const stripe_1 = __importDefault(require("stripe"));
const db_js_1 = require("../db.js");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
async function handleStripeWebhook(req, res) {
    console.log('Webhook handler called');
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('No Stripe signature found');
        return res.status(400).json({ error: 'No Stripe signature found' });
    }
    // Log the raw body to verify we're receiving it correctly
    console.log('Raw body length:', req.body.length);
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log('Successfully constructed event:', event.type);
        switch (event.type) {
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                console.log('Processing subscription update:', subscription.id);
                await updateSubscriptionStatus(subscription);
                break;
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                console.log('Processing successful payment:', invoice.id);
                await handleSuccessfulPayment(invoice);
                break;
            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                console.log('Processing failed payment:', failedInvoice.id);
                await handleFailedPayment(failedInvoice);
                break;
            default:
                console.log('Unhandled event type:', event.type);
        }
        return res.json({ received: true });
    }
    catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).json({ error: err.message });
    }
}
async function updateSubscriptionStatus(subscription) {
    const conn = await db_js_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(`UPDATE user_subscriptions 
       SET status = ?,
           current_period_end = FROM_UNIXTIME(?),
           cancel_at_period_end = ?
       WHERE stripe_subscription_id = ?`, [
            subscription.status,
            subscription.current_period_end,
            subscription.cancel_at_period_end,
            subscription.id
        ]);
        await conn.commit();
    }
    catch (error) {
        await conn.rollback();
        throw error;
    }
    finally {
        conn.release();
    }
}
async function handleSuccessfulPayment(invoice) {
    await db_js_1.pool.query(`INSERT INTO payment_history 
     (user_id, stripe_payment_intent_id, amount, currency, status)
     SELECT user_id, ?, ?, ?, 'succeeded'
     FROM user_subscriptions
     WHERE stripe_subscription_id = ?`, [
        invoice.payment_intent,
        invoice.amount_paid / 100,
        invoice.currency,
        invoice.subscription
    ]);
}
async function handleFailedPayment(invoice) {
    // Implement failed payment handling logic
    console.error('Payment failed for invoice:', invoice.id);
}
//# sourceMappingURL=stripeWebhook.js.map