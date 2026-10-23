import { InfoPage, infoMeta } from '@/components/InfoPage';

export const metadata = infoMeta('refund-policy');

export default function Page() {
  return <InfoPage kind="refund-policy" />;
}
