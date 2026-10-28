import { Schema, model, Types } from 'mongoose'

export type EstadoTutoria = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'completada'

export interface ITutoria {
  oferta: Types.ObjectId
  tutor: Types.ObjectId
  estudiante: Types.ObjectId
  inicio: Date
  fin: Date
  estado: EstadoTutoria
  suscripcion: Types.ObjectId | null
  tarifaHora: number
  distanciaKm: number
  traslado: number
  total: number
}

const tutoriaSchema = new Schema<ITutoria>(
  {
    oferta: { type: Schema.Types.ObjectId, ref: 'Oferta', required: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estudiante: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    inicio: { type: Date, required: true },
    fin: { type: Date, required: true },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada', 'completada'],
      default: 'pendiente',
    },
    suscripcion: { type: Schema.Types.ObjectId, ref: 'Suscripcion', default: null },
    tarifaHora: { type: Number, required: true },
    distanciaKm: { type: Number, default: 0 },
    traslado: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { timestamps: true }
)

export default model<ITutoria>('Tutoria', tutoriaSchema)