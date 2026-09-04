import dynamic from 'next/dynamic';

const NotFoundClient = dynamic(() => import('@/components/404/NotFoundClient'), {
  loading: () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#070a12', 
      color: '#818cf8', 
      fontWeight: 600,
      fontSize: '1.1rem'
    }}>
      Loading Page...
    </div>
  )
});

export const metadata = {
  title: '404 - Page Not Found | Smart Learn',
  description: 'Looks like you hit a glitch in the system! Play the 404 Brick Breaker mini-game to clear the error.',
};

export default function NotFound() {
  return <NotFoundClient />;
}
