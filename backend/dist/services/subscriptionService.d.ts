import Stripe from 'stripe';
export declare class SubscriptionService {
    static getUserSubscription(userId: any): Promise<any>;
    static checkSeatAvailability(userId: any): Promise<{
        hasSubscription: boolean;
        seatLimit?: undefined;
        seatsUsed?: undefined;
        seatsAvailable?: undefined;
    } | {
        hasSubscription: boolean;
        seatLimit: any;
        seatsUsed: any;
        seatsAvailable: number;
    }>;
    static createSubscription(userId: any, planId: any, paymentMethodId: any): Promise<Stripe.Response<Stripe.Subscription>>;
    static cancelSubscription(userId: any, cancelImmediately?: boolean): Promise<{
        success: boolean;
    }>;
    static getSubscriptionPlans(): Promise<import("mysql2").QueryResult>;
}
