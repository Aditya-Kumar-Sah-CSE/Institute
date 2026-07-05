import { stripe } from '@/lib/stripe/client';
import { dbMaster } from '@/lib/db/master';
import { tenants } from '@/lib/db/schema/master-schema';
import { eq } from 'drizzle-orm';
import { type Stripe } from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return new Response('Webhook secret missing', { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        
        if (tenantId) {
          await dbMaster.update(tenants)
            .set({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              billing_status: 'active',
              updated_at: new Date(),
            })
            .where(eq(tenants.id, tenantId));
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find tenant by customer ID and update period end
        await dbMaster.update(tenants)
          .set({
            current_period_end: new Date(subscription.current_period_end * 1000),
            billing_status: subscription.status === 'active' ? 'active' : 'past_due',
            updated_at: new Date(),
          })
          .where(eq(tenants.stripe_customer_id, customerId));
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Suspend the tenant when subscription is canceled/deleted
        await dbMaster.update(tenants)
          .set({
            billing_status: 'suspended',
            status: 'suspended', // Block access
            updated_at: new Date(),
          })
          .where(eq(tenants.stripe_customer_id, customerId));
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Mark as past_due if payment fails
        await dbMaster.update(tenants)
          .set({
            billing_status: 'past_due',
            updated_at: new Date(),
          })
          .where(eq(tenants.stripe_customer_id, customerId));
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }

  return new Response('Webhook handled successfully', { status: 200 });
}
