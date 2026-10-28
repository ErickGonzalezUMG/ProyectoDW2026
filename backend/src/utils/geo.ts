export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

export function distanciaLinea(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = (g: number): number => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function distanciaPorCalles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${lon1},${lat1};${lon2},${lat2}?overview=false`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const datos = (await res.json()) as { code?: string; routes?: { distance: number }[] }
      if (datos.code === 'Ok' && datos.routes && datos.routes.length > 0) {
        return redondear(datos.routes[0].distance / 1000)
      }
    }
  } catch {
    // Si el servicio de rutas no responde, se usa la distancia en línea recta.
  }

  return redondear(distanciaLinea(lat1, lon1, lat2, lon2))
}