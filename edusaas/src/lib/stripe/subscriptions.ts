import { stripe } from './client';
import { dbMaster } from '@/lib/db/master';
import { tenants } from '@/lib/db/schema/master-schema';
import { eq } from 'drizzle-orm';

export async function createCheckoutSession(tenantId: string, email: string, planType: 'basic' | 'pro' | 'enterprise') {
  // Define Price IDs (In a real app, this should be mapped to environment variables)
  const priceIds = {
    basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder',
    pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder',
  };

  const priceId = priceIds[planType];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tenantId, // Essential to tie the webhook response back to our tenant
      },
      success_url: `${process.env.NEXTAUTH_URL}/admin/institutes?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/admin/institutes?canceled=true`,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error(`Failed to cancel subscription ${subscriptionId}`, error);
    throw error;
  }
}
