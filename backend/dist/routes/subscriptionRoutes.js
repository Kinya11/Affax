"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const auth_ts_1 = require("../auth.ts");
const promise_1 = __importDefault(require("mysql2/promise"));
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
// Create pool connection
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
router.post('/create', auth_ts_1.authenticateToken, async (req, res) => {
    try {
        const { paymentMethodId, priceId } = req.body;
        // Get the customer ID from your database, or create a new customer
        let customerId;
        const [customerRows] = await pool.query('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.userId]);
        if (customerRows[0]?.stripe_customer_id) {
            customerId = customerRows[0].stripe_customer_id;
        }
        else {
            const customer = await stripe.customers.create({
                payment_method: paymentMethodId,
                email: req.user.email,
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            customerId = customer.id;
            await pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, req.user.userId]);
        }
        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });
        // Store subscription info in your database
        await pool.query(`INSERT INTO user_subscriptions 
       (user_id, stripe_subscription_id, status, price_id) 
       VALUES (?, ?, ?, ?)`, [req.user.userId, subscription.id, subscription.status, priceId]);
        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    }
    catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/plans', async (req, res) => {
    try {
        const prices = await stripe.prices.list({
            active: true,
            type: 'recurring',
            expand: ['data.product']
        });
        res.json(prices.data);
    }
    catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=subscriptionRoutes.js.map