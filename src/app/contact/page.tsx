import { pageMeta } from '@/lib/seo';
import { getSettings } from '@/lib/settings';
import { businessAddress, supportEmail } from '@/lib/config';

export const metadata = pageMeta({
  title: 'Contact us | droptaxi.com',
  description: 'Phone, email and WhatsApp contact for droptaxi.com.',
  path: '/contact',
});

export default async function ContactPage() {
  const { supportPhone, whatsappNumber } = await getSettings();
  return (
    <div className="page-narrow">
      <h1>Contact us</h1>
      <ul>
        <li>Phone: <a href={`tel:${supportPhone}`}>{supportPhone}</a></li>
        <li>Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></li>
        <li>WhatsApp: <a href={`https://wa.me/${whatsappNumber}`}>Message us</a></li>
        <li>Address: {businessAddress}</li>
      </ul>
    </div>
  );
}
