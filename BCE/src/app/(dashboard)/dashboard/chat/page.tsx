import ChatInterface from '@/features/chat/components/ChatInterface';

export const metadata = {
  title: 'Campus Chat | SkillArena',
};

export default function ChatPage() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatInterface />
    </div>
  );
}
