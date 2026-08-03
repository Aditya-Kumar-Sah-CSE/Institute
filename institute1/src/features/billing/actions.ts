'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

const SUPER_ADMIN_EMAIL = 'iambestadi@gmail.com';

/**
 * Universally assert SUPER_ADMIN clearance for all mutating billing actions
 */
async function authenticateSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');
  
  // Both email and role condition
  // Actually since 'profiles' tables contains the role, we must fetch from profiles
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  const isSuper = (user.email === SUPER_ADMIN_EMAIL || profile?.role === 'super_admin');
  
  if (!isSuper) {
    throw new Error('Forbidden: Super Admin Access Required');
  }

  return { supabase, user, profile };
}

/**
 * Admin read-only level authentication (Can view, cannot mutate)
 */
export async function authenticateAdminOrSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  const isSuper = (user.email === SUPER_ADMIN_EMAIL || profile?.role === 'super_admin');
  const isAdmin = (profile?.role === 'admin');
  
  if (!isSuper && !isAdmin) {
    throw new Error('Forbidden: Dashboard Access Required');
  }

  return { supabase, user, isSuperAdmin: isSuper };
}

// ==========================================
// PRICING PLANS
// ==========================================

export async function fetchPlans() {
  noStore();
  const { supabase, isSuperAdmin } = await authenticateAdminOrSuper();
  
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*, subscriptions(id, status, total_paid)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  
  return data;
}

export async function createPlan(data: any) {
  const { supabase, user } = await authenticateSuperAdmin();
  
  const { error } = await supabase.from('pricing_plans').insert({
    ...data,
    created_by: user.id
  });
  
  if (error) throw error;
  
  // Audit log
  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'created_plan',
    table_name: 'pricing_plans',
    new_data: data
  });
  
  revalidatePath('/admin/payment-model');
  return true;
}

export async function updatePlan(planId: string, data: any) {
  const { supabase, user } = await authenticateSuperAdmin();
  
  const { error } = await supabase.from('pricing_plans').update(data).eq('id', planId);
  if (error) throw error;

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'updated_plan',
    table_name: 'pricing_plans',
    record_id: planId,
    new_data: data
  });
  
  revalidatePath('/admin/payment-model');
  return true;
}

export async function deletePlan(planId: string) {
  const { supabase, user } = await authenticateSuperAdmin();
  // Soft delete for reference integrity constraints
  const { error } = await supabase.from('pricing_plans').update({ is_deleted: true, status: 'archived' }).eq('id', planId);
  if (error) throw error;
  
  await supabase.from('audit_logs').insert({
    admin_id: user.id, admin_email: user.email, action: 'deleted_plan', table_name: 'pricing_plans', record_id: planId
  });
  
  revalidatePath('/admin/payment-model');
  return true;
}

// ==========================================
// ANALYTICS & REVENUE
// ==========================================

export async function fetchRevenueMetrics() {
  noStore();
  const { supabase } = await authenticateAdminOrSuper();
  
  const [plans, subs, payments] = await Promise.all([
    supabase.from('pricing_plans').select('id, name', { count: 'exact' }).eq('is_deleted', false),
    supabase.from('subscriptions').select('id, status, pricing_plans(monthly_price)'),
    supabase.from('transactions').select('amount, status').eq('status', 'successful')
  ]);
  
  const totalRevenue = payments.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  let mrr = 0;
  let activeSubsCount = 0;
  let trialSubsCount = 0;

  subs.data?.forEach(s => {
    if (s.status === 'active' || s.status === 'paid') {
      activeSubsCount++;
      if (s.pricing_plans && (s.pricing_plans as any).monthly_price) {
         mrr += Number((s.pricing_plans as any).monthly_price);
      }
    } else if (s.status === 'trial') {
      trialSubsCount++;
    }
  });

  return {
    totalPlans: plans.count || 0,
    mrr,
    arr: mrr * 12,
    totalRevenue,
    activeSubscriptions: activeSubsCount,
    trialInstitutions: trialSubsCount
  };
}

export async function fetchChartData(days = 30) {
  noStore();
  const { supabase } = await authenticateAdminOrSuper();
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase.from('transactions')
    .select('amount, created_at')
    .eq('status', 'successful')
    .gte('created_at', dateFrom)
    .order('created_at', { ascending: true });
    
  const chartData: Record<string, { name: string, revenue: number }> = {};
  
  data?.forEach(t => {
     const d = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     if (!chartData[d]) chartData[d] = { name: d, revenue: 0 };
     chartData[d].revenue += Number(t.amount);
  });
  
  return Object.values(chartData);
}

// ==========================================
// COUPONS
// ==========================================

export async function fetchCoupons() {
  noStore();
  const { supabase } = await authenticateAdminOrSuper();
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCoupon(data: any) {
  const { supabase, user } = await authenticateSuperAdmin();
  const { error } = await supabase.from('coupons').insert({ ...data, created_by: user.id });
  if (error) throw error;
  
  await supabase.from('audit_logs').insert({ admin_id: user.id, admin_email: user.email, action: 'created_coupon', table_name: 'coupons', new_data: data });
  revalidatePath('/admin/payment-model');
  return true;
}

export async function deleteCoupon(id: string) {
  const { supabase, user } = await authenticateSuperAdmin();
  const { error } = await supabase.from('coupons').update({ status: 'disabled' }).eq('id', id);
  if (error) throw error;
  await supabase.from('audit_logs').insert({ admin_id: user.id, admin_email: user.email, action: 'deleted_coupon', table_name: 'coupons', record_id: id });
  revalidatePath('/admin/payment-model');
  return true;
}

// ==========================================
// PAYMENT SETTINGS
// ==========================================

export async function fetchPaymentSettings() {
  noStore();
  const { supabase } = await authenticateAdminOrSuper();
  const { data, error } = await supabase.from('payment_settings').select('*').limit(1).single();
  if (error && error.code !== 'PGRST116') throw error; // Allow empty
  return data;
}

export async function savePaymentSettings(data: any) {
  const { supabase, user } = await authenticateSuperAdmin();
  const { error } = await supabase.from('payment_settings').upsert({ ...data, id: data.id, updated_by: user.id });
  if (error) throw error;
  await supabase.from('audit_logs').insert({ admin_id: user.id, admin_email: user.email, action: 'updated_settings', table_name: 'payment_settings', new_data: data });
  revalidatePath('/admin/payment-model');
  return true;
}

// ==========================================
// SUBSCRIPTIONS & INVOICES
// ==========================================

export async function fetchSubscriptions() {
  noStore();
  const { supabase } = await authenticateAdminOrSuper();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, pricing_plans(*), profiles(name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function generateInvoice(subscriptionId: string) {
  const { supabase, user } = await authenticateSuperAdmin();
  // Simplified logic
  const invNumber = 'INV-' + Math.floor(Math.random() * 1000000);
  const { error } = await supabase.from('invoices').insert({
    invoice_number: invNumber,
    subscription_id: subscriptionId,
    amount: 0, gst_amount: 0, total_amount: 0
  });
  if (error) throw error;
  await supabase.from('audit_logs').insert({ admin_id: user.id, admin_email: user.email, action: 'generated_invoice' });
  return true;
}

