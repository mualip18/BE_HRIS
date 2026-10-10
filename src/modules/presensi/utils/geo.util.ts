// ============================================================
// GEO UTILS — Hitung jarak GPS (Haversine)
// ============================================================
// Dipakai untuk validasi radius presensi.
// ============================================================

const EARTH_RADIUS_METER = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Hitung jarak antara 2 titik koordinat (meter).
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METER * c;
}

export interface LocationLike {
  id: string;
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

export interface RadiusCheckResult {
  inside: boolean;
  nearestLocation: LocationLike | null;
  distance: number | null;
}

/**
 * Cari lokasi terdekat dari user, cek apakah user ada di dalam radius.
 */
export function findNearestLocationWithinRadius(
  userLat: number,
  userLng: number,
  locations: LocationLike[]
): RadiusCheckResult {
  let nearest: LocationLike | null = null;
  let nearestDistance = Infinity;

  for (const loc of locations) {
    const d = calculateDistanceMeters(
      userLat,
      userLng,
      loc.latitude,
      loc.longitude
    );
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = loc;
    }
  }

  if (!nearest) {
    return { inside: false, nearestLocation: null, distance: null };
  }

  return {
    inside: nearestDistance <= nearest.radius_meter,
    nearestLocation: nearest,
    distance: Math.round(nearestDistance),
  };
}