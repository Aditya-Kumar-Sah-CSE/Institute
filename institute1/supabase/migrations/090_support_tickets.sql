CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert
CREATE POLICY "Anyone can submit support tickets" ON support_tickets
    FOR INSERT WITH CHECK (true);

-- Policy: Only service role can select
CREATE POLICY "Service role can read" ON support_tickets
    FOR SELECT TO service_role USING (true);

-- Policy: Only service role can update
CREATE POLICY "Service role can update" ON support_tickets
    FOR UPDATE TO service_role USING (true);
