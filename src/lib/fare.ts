import { fareConfig } from './config';
import type { FareQuote } from './types';

export interface Vehicle {
  id: number;
  name: string;
  seats: number;
  ratePerKm: number;
  driverAllowance: number;
  roundTripRatePerKm: number;
  roundTripDriverAllowance: number;
  imageFile: string | null;
  active: boolean;
}

const money = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

function build(v: Vehicle, billableKm: number, ratePerKm: number, baseFare: number, allowance: number, gst: number, tolls: number, permit: number): FareQuote {
  return {
    vehicleId: v.id,
    vehicle: v.name,
    seats: v.seats,
    image: v.imageFile,
    billableKm,
    ratePerKm: money(ratePerKm),
    baseFare,
    driverAllowance: allowance,
    tolls,
    permitFee: permit,
    gst,
    total: money(baseFare + allowance + gst + tolls + permit),
  };
}

/**
 * Fare = max(distance, minKm) x rate per km + the vehicle's driver batta, plus GST on that amount.
 * Tolls and permit fees are never added: they are extra, paid as per actuals.
 * `gstRate` is zero while the staff GST switch is off.
 */
export function quote(distanceKm: number, v: Vehicle, gstRate: number): FareQuote {
  const billableKm = Math.max(distanceKm, fareConfig.minKm);
  const baseFare = money(billableKm * v.ratePerKm);
  const allowance = money(v.driverAllowance);
  const gst = money((baseFare + allowance) * gstRate);
  return build(v, billableKm, v.ratePerKm, baseFare, allowance, gst, 0, 0);
}

/**
 * Round trip over `days` calendar days: billed km is the larger of twice the one-way distance and the daily
 * minimum x days, at the vehicle's round trip rate and batta (per day).
 */
export function quoteRoundTrip(oneWayKm: number, days: number, v: Vehicle, gstRate: number): FareQuote {
  const billableKm = Math.max(oneWayKm * 2, fareConfig.roundTripMinKmPerDay * days);
  const baseFare = money(billableKm * v.roundTripRatePerKm);
  const allowance = money(v.roundTripDriverAllowance * days);
  const gst = money((baseFare + allowance) * gstRate);
  return build(v, billableKm, v.roundTripRatePerKm, baseFare, allowance, gst, 0, 0);
}

/** Local package: included km x vehicle rate plus an hourly charge, GST on the total. No driver allowance. */
export function quotePackage(hours: number, km: number, v: Vehicle, gstRate: number): FareQuote {
  const baseFare = money(km * v.ratePerKm + fareConfig.packageHourRate * hours);
  const gst = money(baseFare * gstRate);
  return build(v, km, v.ratePerKm, baseFare, 0, gst, 0, 0);
}

export const findPackage = (hours: number) => fareConfig.packages.find((p) => p.hours === hours) ?? null;
