import type { Coordenada } from '../types'

export interface RutaCalculada {
  distanciaKm: number
  puntos: [number, number][]
}

export async function obtenerRuta(desde: Coordenada, hasta: Coordenada): Promise<RutaCalculada | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}` +
    `?overview=full&geometries=geojson`

  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const datos = await res.json()
    if (datos.code !== 'Ok' || !datos.routes || datos.routes.length === 0) return null

    const ruta = datos.routes[0]
    const puntos: [number, number][] = ruta.geometry.coordinates.map(
      (p: [number, number]): [number, number] => [p[1], p[0]]
    )

    return {
      distanciaKm: Math.round((ruta.distance / 1000) * 100) / 100,
      puntos,
    }
  } catch {
    return null
  }
}