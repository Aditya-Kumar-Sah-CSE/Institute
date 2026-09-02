const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:4.H2ygYDM&8S6i!@db.myubfyfnovlvlzvglryv.supabase.co:5432/postgres' });
async function apply() {
  await client.connect();
  const sql = `
    DROP POLICY IF EXISTS "Users can delete chats they own or are part of" ON chat_conversations;
    CREATE POLICY "Users can delete chats they own or are part of" ON chat_conversations
      FOR DELETE USING (
        id IN (
          SELECT conversation_id FROM chat_members 
          WHERE user_id = auth.uid() AND (
            chat_conversations.type = 'personal' 
            OR chat_members.role IN ('owner', 'admin')
          )
        )
      );
  `;
  await client.query(sql);
  console.log('Successfully fixed RLS policy');
  await client.end();
}
apply().catch(console.error);
