import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Coordenada, ResultadoBusqueda } from '../types'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface Props {
  origen: Coordenada
  radio: number
  resultados: ResultadoBusqueda[]
  seleccionado: string | null
  ruta?: [number, number][] | null
  onOrigen: (c: Coordenada) => void
  onSeleccionar: (id: string) => void
}

function Recentrar({ centro }: { centro: Coordenada }) {
  const mapa = useMap()
  useEffect(() => {
    mapa.setView([centro.lat, centro.lng])
  }, [centro.lat, centro.lng])
  return null
}

function AjustarVista({ ruta }: { ruta: [number, number][] | null }) {
  const mapa = useMap()
  useEffect(() => {
    if (ruta && ruta.length > 1) {
      mapa.fitBounds(L.latLngBounds(ruta), { padding: [40, 40] })
    }
  }, [ruta])
  return null
}

function ClicOrigen({ onOrigen }: { onOrigen: (c: Coordenada) => void }) {
  useMapEvents({
    click(e) {
      onOrigen({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function MapaBusqueda({ origen, radio, resultados, seleccionado, ruta = null, onOrigen, onSeleccionar }: Props) {
  return (
    <MapContainer
      center={[origen.lat, origen.lng]}
      zoom={13}
      style={{ height: 'clamp(320px, 60vh, 520px)', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recentrar centro={origen} />
      <AjustarVista ruta={ruta} />
      <ClicOrigen onOrigen={onOrigen} />

      <Circle
        center={[origen.lat, origen.lng]}
        radius={radio * 1000}
        pathOptions={{ color: '#2e86c1', fillOpacity: 0.05 }}
      />
      <CircleMarker
        center={[origen.lat, origen.lng]}
        radius={9}
        pathOptions={{ color: '#1f4e79', fillColor: '#1f4e79', fillOpacity: 1 }}
      >
        <Popup>Punto de búsqueda</Popup>
      </CircleMarker>

      {ruta && <Polyline positions={ruta} pathOptions={{ color: '#e67e22', weight: 5 }} />}

      {resultados
        .filter(r => r.distanciaKm !== null && r.tutor.latitud !== null && r.tutor.longitud !== null)
        .map(r => (
          <Marker
            key={r._id}
            position={[r.tutor.latitud as number, r.tutor.longitud as number]}
            opacity={seleccionado === null || seleccionado === r._id ? 1 : 0.6}
            eventHandlers={{ click: () => onSeleccionar(r._id) }}
          >
            <Popup>
              <strong>{r.tutor.nombre}</strong>
              <br />
              {r.titulo}
              <br />
              Total: Q{r.total} · {r.distanciaKm} km
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}

export default MapaBusqueda