export class StripeService {
    static createCustomer(user: any): Promise<Stripe.Response<Stripe.Customer>>;
    static getOrCreateCustomer(user: any): Promise<Stripe.Response<Stripe.Customer> | (Stripe.DeletedCustomer & {
        lastResponse: {
            headers: {
                [key: string]: string;
            };
            requestId: string;
            statusCode: number;
            apiVersion?: string;
            idempotencyKey?: string;
            stripeAccount?: string;
        };
    })>;
    static createSubscription(userId: any, priceId: any): Promise<Stripe.Response<Stripe.Subscription>>;
    static cancelSubscription(subscriptionId: any, cancelImmediately?: boolean): Promise<Stripe.Response<Stripe.Subscription>>;
}
import Stripe from 'stripe';
