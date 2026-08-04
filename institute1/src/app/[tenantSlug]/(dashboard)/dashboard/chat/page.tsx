import ChatInterface from '@/features/chat/components/ChatInterface';

export const metadata = {
  title: 'Global Chat | Dashboard',
};

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto bg-white dark:bg-[#13161f] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex">
      <ChatInterface />
    </div>
  );
}
