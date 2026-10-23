import { InfoPage, infoMeta } from '@/components/InfoPage';

export const metadata = infoMeta('about-us');

export default function Page() {
  return <InfoPage kind="about-us" />;
}
