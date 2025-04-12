import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class SubscriptionService {
  async createSubscription(userId, priceId, paymentMethodId) {
    const [user] = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    let customerId = user[0]?.stripe_customer_id;

    if (!customerId) {
      const [userDetails] = await pool.query(
        'SELECT email, first_name, last_name FROM users WHERE id = ?',
        [userId]
      );
      
      const customer = await stripe.customers.create({
        email: userDetails[0].email,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
        name: `${userDetails[0].first_name} ${userDetails[0].last_name}`
      });
      
      customerId = customer.id;
      await pool.query(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
        [customerId, userId]
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });

    await pool.query(
      `INSERT INTO user_subscriptions 
       (user_id, stripe_subscription_id, status, current_period_end)
       VALUES (?, ?, ?, FROM_UNIXTIME(?))`,
      [userId, subscription.id, subscription.status, subscription.current_period_end]
    );

    return subscription;
  }

  async checkSeatAvailability(userId) {
    const [subscription] = await pool.query(
      `SELECT l.seat_limit, COUNT(d.id) as used_seats
       FROM user_subscriptions us
       JOIN licenses l ON us.license_id = l.id
       LEFT JOIN devices d ON d.user_id = us.user_id AND d.is_active = TRUE
       WHERE us.user_id = ? AND us.status = 'active'
       GROUP BY us.id`,
      [userId]
    );

    if (!subscription.length) {
      return { hasAvailableSeats: false, reason: 'NO_SUBSCRIPTION' };
    }

    const { seat_limit, used_seats } = subscription[0];
    return {
      hasAvailableSeats: used_seats < seat_limit,
      seatsRemaining: seat_limit - used_seats,
      totalSeats: seat_limit,
      usedSeats: used_seats
    };
  }
}