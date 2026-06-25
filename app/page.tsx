import { WelcomeLanding } from '@/src/components/welcome/WelcomeLanding';

const ceramicsUrl = process.env.CERAMICS_APP_URL || 'http://localhost:3001';
const yogaUrl = process.env.YOGA_APP_URL || 'http://localhost:3002';

export default function RootPage() {
  return <WelcomeLanding ceramicsUrl={ceramicsUrl} yogaUrl={yogaUrl} />;
}
