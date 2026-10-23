import { pageMeta } from '@/lib/seo';
import { tariff } from '@/lib/catalog';
import { inr, num } from '@/lib/format';

export const metadata = pageMeta({
  title: 'One Way Drop Taxi Tariff - Rate per km | droptaxi.com',
  description: 'Rate per km for every car type, minimum billed distance, driver allowance and GST for one way drop taxi trips.',
  path: '/tariff-chart',
});

const heading = { fontSize: '1.35rem', lineHeight: 1.2, margin: '28px 0 12px' } as const;

export default async function TariffPage() {
  const t = await tariff();
  return (
    <div className="page-narrow">
      <h1 style={{ ...heading, marginTop: 0 }}>Drop trip tariff</h1>
      <table>
        <tbody>
          <tr><th>Vehicle</th><th>Seats</th><th>Rate per km</th><th>Driver batta</th></tr>
          {t.vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.name}</td>
              <td>{v.seats}+1</td>
              <td className="price">{inr(v.ratePerKm, 0, 2)}</td>
              <td className="price">{inr(v.driverAllowance, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={heading}>Round trip tariff</h2>
      <table>
        <tbody>
          <tr><th>Vehicle</th><th>Seats</th><th>Rate per km</th><th>Driver batta (per day)</th></tr>
          {t.vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.name}</td>
              <td>{v.seats}+1</td>
              <td className="price">{inr(v.roundTripRatePerKm, 0, 2)}</td>
              <td className="price">{inr(v.roundTripDriverAllowance, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={heading}>How the fare is calculated</h2>
      <ul>
        <li>Billed distance is the route distance, with a minimum of {num(t.minKm)} km per one way trip.</li>
        <li>Driver batta (shown for each vehicle above) is added per day of the trip.</li>
        {t.gstEnabled && <li>GST of {num(t.gstRate * 100, 0, 2)}% applies to the distance fare plus driver batta.</li>}
        <li>
          Round trips are billed for at least {num(t.roundTripMinKmPerDay)} km for every calendar day (12:00 am to 11:59 pm).
          A 3 day round trip is billed for at least {num(t.roundTripMinKmPerDay * 3)} km, even if the car runs less. Tolls and permits are extra, as per actuals.
        </li>
        <li>Toll charges and any state permit fee are not in the fare. They are extra and paid as per actuals.</li>
      </ul>
      <p className="note">Exact fares for each route are shown on the route page before you book.</p>
    </div>
  );
}
