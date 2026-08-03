-- ==========================================
-- 078_payment_billing_module.sql
-- ==========================================

-- 1. PRICING PLANS
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    monthly_price NUMERIC(10, 2) NOT NULL,
    yearly_price NUMERIC(10, 2) NOT NULL,
    student_limit INTEGER NOT NULL,
    faculty_limit INTEGER NOT NULL,
    storage_limit_gb INTEGER NOT NULL,
    courses_limit INTEGER NOT NULL,
    assignments_limit INTEGER NOT NULL,
    ai_credits INTEGER NOT NULL,
    custom_branding BOOLEAN DEFAULT false,
    analytics BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    certificate_module BOOLEAN DEFAULT false,
    attendance_module BOOLEAN DEFAULT false,
    community_access BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_status ON pricing_plans(status);

-- 2. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES pricing_plans(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'trial' CHECK (status IN ('active', 'cancelled', 'paused', 'trial', 'expired', 'past_due')),
    renews_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    total_paid NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    canceled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_subs_institution ON subscriptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);

-- 3. PAYMENT SETTINGS
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency TEXT DEFAULT 'INR',
    tax_percentage NUMERIC(5, 2) DEFAULT 0,
    gst_percentage NUMERIC(5, 2) DEFAULT 18.00,
    active_gateway TEXT DEFAULT 'razorpay' CHECK (active_gateway IN ('razorpay', 'stripe', 'cashfree')),
    invoice_prefix TEXT DEFAULT 'INV-',
    grace_period_days INTEGER DEFAULT 3,
    late_fee_amount NUMERIC(8, 2) DEFAULT 0,
    auto_invoice BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES auth.users(id)
);

-- Init default settings row
INSERT INTO payment_settings (currency, gst_percentage) VALUES ('INR', 18.00) ON CONFLICT DO NOTHING;

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL,
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_sub ON transactions(subscription_id);

-- 5. PAYMENTS (Higher level aggregate if needed, but transactions often suffice. Creating as requested)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    payment_method TEXT
);

-- 6. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    gst_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'paid' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    pdf_url TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    due_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_invoices_inst ON invoices(institution_id);

-- 7. COUPONS
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10, 2) NOT NULL,
    max_discount NUMERIC(10, 2),
    min_purchase NUMERIC(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    institution_specific UUID REFERENCES profiles(id) ON DELETE CASCADE,
    valid_until TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 8. COUPON USAGE
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    discount_applied NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    gateway_refund_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id)
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at);

-- ==========================================
-- RLS POLICIES (SUPER_ADMIN / ADMIN Logic)
-- ==========================================
-- Create function to check if user is admin (read-only for normal admins)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'iambestadi@gmail.com' 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    is_super_admin() 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Pricing Plans: READ for anyone, WRITE only for super_admin
CREATE POLICY "Pricing plans viewable by all" ON pricing_plans FOR SELECT USING (true);
CREATE POLICY "Pricing plans insert super_admin" ON pricing_plans FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "Pricing plans update super_admin" ON pricing_plans FOR UPDATE USING (is_super_admin());
CREATE POLICY "Pricing plans delete super_admin" ON pricing_plans FOR DELETE USING (is_super_admin());

-- Subscriptions: READ for admin/super Or institution themselves. WRITE only super_admin.
CREATE POLICY "Subs view admin" ON subscriptions FOR SELECT USING (is_admin_or_super() OR institution_id = auth.uid());
CREATE POLICY "Subs write super_admin" ON subscriptions FOR ALL USING (is_super_admin());

-- Payment Settings: READ for admin/super. WRITE only super_admin
CREATE POLICY "Settings view admin" ON payment_settings FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Settings write super_admin" ON payment_settings FOR ALL USING (is_super_admin());

-- Coupons: READ for admin/super. WRITE only super
CREATE POLICY "Coupons view admin" ON coupons FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Coupons write super_admin" ON coupons FOR ALL USING (is_super_admin());

-- Invoices: READ for admin/super/institution.
CREATE POLICY "Invoices view" ON invoices FOR SELECT USING (is_admin_or_super() OR institution_id = auth.uid());
CREATE POLICY "Invoices write super" ON invoices FOR ALL USING (is_super_admin());

-- Transactions / Payments:
CREATE POLICY "Transactions view" ON transactions FOR SELECT USING (is_admin_or_super() OR institution_id = auth.uid());
CREATE POLICY "Transactions write" ON transactions FOR ALL USING (is_super_admin() OR institution_id = auth.uid()); 

-- Audit logs: READ admin/super, INSERT from trusted backend functions usually, but we restrict client side:
CREATE POLICY "Audit view admin" ON audit_logs FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Audit write admin" ON audit_logs FOR INSERT WITH CHECK (is_admin_or_super());
