import { pageMeta } from '@/lib/seo';
import { getSettings } from '@/lib/settings';
import { OPERATOR_NAME, businessAddress, businessMapUrl, supportEmail } from '@/lib/config';

export const metadata = pageMeta({
  title: 'Contact us | 247 Drop Taxi',
  description: 'Call, WhatsApp or email 247 Drop Taxi to book a one way drop taxi or outstation cab. Office in Vandalur, Chennai, open 24x7.',
  path: '/contact',
});

export default async function ContactPage() {
  const { supportPhone, whatsappNumber } = await getSettings();
  return (
    <div className="page-narrow">
      <h1>Contact us</h1>
      <p>247 Drop Taxi is run by {OPERATOR_NAME}. Call or message us at any hour to book a one way drop taxi or an outstation cab.</p>
      <ul>
        <li>Phone: <a href={`tel:${supportPhone}`}>{supportPhone}</a></li>
        <li>Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></li>
        <li>WhatsApp: <a href={`https://wa.me/${whatsappNumber}`}>Message us</a></li>
        <li>Address: {businessAddress} (<a href={businessMapUrl} target="_blank" rel="noopener">view on Google Maps</a>)</li>
      </ul>
    </div>
  );
}
