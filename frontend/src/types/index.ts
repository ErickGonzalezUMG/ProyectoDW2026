export interface Usuario {
  id: string
  nombre: string
  correo: string
  foto: string
  rol: 'estudiante' | 'tutor' | 'admin'
  perfilCompleto: boolean
  aprobado: boolean
  estado?: 'activo' | 'suspendido'
}

export interface Categoria {
  _id: string
  nombre: string
  padre: string | null
}

export interface TutorAdmin {
  _id: string
  nombre: string
  correo: string
  telefono: string
  hojaVida: string
  biografia: string
  tarifaBase: number
  aprobado: boolean
  categorias: { _id: string; nombre: string }[]
}

export type Modalidad = 'virtual' | 'casa_tutor' | 'casa_estudiante'

export interface Oferta {
  _id: string
  categoria: { _id: string; nombre: string }
  titulo: string
  descripcion: string
  modalidad: Modalidad
  tarifaHora: number
  tarifaKm: number
  activa: boolean
  tutor?: { _id: string; nombre: string }
}

export interface Coordenada {
  lat: number
  lng: number
}

export interface ResultadoBusqueda {
  _id: string
  titulo: string
  descripcion: string
  modalidad: Modalidad
  categoria: string
  tarifaHora: number
  tarifaKm: number
  distanciaKm: number | null
  traslado: number
  total: number
  tutor: {
    _id: string
    nombre: string
    foto: string
    biografia: string
    latitud: number | null
    longitud: number | null
    calificacion: number
    resenas: number
  }
}

export type EstadoTutoria = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'completada'

export interface Tutoria {
  _id: string
  oferta: { _id: string; titulo: string; modalidad: Modalidad } | null
  tutor: { _id: string; nombre: string }
  estudiante: { _id: string; nombre: string }
  inicio: string
  fin: string
  estado: EstadoTutoria
  suscripcion: string | null
  tarifaHora: number
  distanciaKm: number
  traslado: number
  total: number
}

export interface Resena {
  _id: string
  tutoria: string
  tutor: string
  estudiante: string
  calificacion: number
  comentario: string
}

export interface SuspensionInfo {
  _id: string
  motivo: string
  createdAt: string
}

export interface ApelacionInfo {
  _id: string
  mensaje: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  createdAt: string
}