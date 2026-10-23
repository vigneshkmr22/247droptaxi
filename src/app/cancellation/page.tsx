import { InfoPage, infoMeta } from '@/components/InfoPage';

export const metadata = infoMeta('cancellation');

export default function Page() {
  return <InfoPage kind="cancellation" />;
}
