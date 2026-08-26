import dynamic from 'next/dynamic';

const BrickBreakerGame = dynamic(() => import('@/components/404/BrickBreakerGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f19',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#06b6d4',
      fontSize: '14px',
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif'
    }}>
      Loading 404 Brick Breaker Arcade...
    </div>
  ),
});

export const metadata = {
  title: '404 - Page Not Found | Smart Learn',
  description: 'Looks like you hit a glitch in the system! Play the 404 Brick Breaker mini-game to clear the error.',
};

export default function NotFound() {
  return <BrickBreakerGame />;
}
