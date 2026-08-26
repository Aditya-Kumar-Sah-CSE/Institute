import BrickBreakerGame from '@/components/404/BrickBreakerGame';

export const metadata = {
  title: '404 - Page Not Found | Smart Learn',
  description: 'Looks like you hit a glitch in the system! Play the 404 Brick Breaker mini-game to clear the error.',
};

export default function NotFound() {
  return <BrickBreakerGame />;
}
