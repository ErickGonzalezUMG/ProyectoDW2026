import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface Props {
  latitud: number | null
  longitud: number | null
  onCambio: (lat: number, lng: number) => void
}

function ClicEnMapa({ onCambio }: { onCambio: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onCambio(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function SelectorUbicacion({ latitud, longitud, onCambio }: Props) {
  const centro: [number, number] = [14.6349, -90.5069]

  return (
    <MapContainer
      center={latitud !== null && longitud !== null ? [latitud, longitud] : centro}
      zoom={13}
      style={{ height: '300px', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClicEnMapa onCambio={onCambio} />
      {latitud !== null && longitud !== null && <Marker position={[latitud, longitud]} />}
    </MapContainer>
  )
}

export default SelectorUbicacion