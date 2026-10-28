import { Schema, model, Types } from 'mongoose'

export interface ISesionFija {
  diaSemana: number
  horaInicio: number
  horas: number
}

export interface ISuscripcion {
  oferta: Types.ObjectId
  tutor: Types.ObjectId
  estudiante: Types.ObjectId
  semanas: number
  fechaInicio: string
  sesiones: ISesionFija[]
  estado: 'activa' | 'cancelada'
  total: number
}

const sesionSchema = new Schema<ISesionFija>(
  {
    diaSemana: { type: Number, required: true },
    horaInicio: { type: Number, required: true },
    horas: { type: Number, required: true },
  },
  { _id: false }
)

const suscripcionSchema = new Schema<ISuscripcion>(
  {
    oferta: { type: Schema.Types.ObjectId, ref: 'Oferta', required: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estudiante: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    semanas: { type: Number, required: true, enum: [4, 8] },
    fechaInicio: { type: String, required: true },
    sesiones: { type: [sesionSchema], required: true },
    estado: { type: String, enum: ['activa', 'cancelada'], default: 'activa' },
    total: { type: Number, required: true },
  },
  { timestamps: true }
)

export default model<ISuscripcion>('Suscripcion', suscripcionSchema)