import { InfoPage, infoMeta } from '@/components/InfoPage';

export const metadata = infoMeta('terms');

export default function Page() {
  return <InfoPage kind="terms" />;
}
