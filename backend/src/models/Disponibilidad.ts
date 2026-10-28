import { Schema, model, Types } from 'mongoose'

export interface IDisponibilidad {
  tutor: Types.ObjectId
  diaSemana: number
  horaInicio: number
  horaFin: number
}

const disponibilidadSchema = new Schema<IDisponibilidad>(
  {
    tutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    diaSemana: { type: Number, required: true, min: 0, max: 6 },
    horaInicio: { type: Number, required: true, min: 0, max: 23 },
    horaFin: { type: Number, required: true, min: 1, max: 24 },
  },
  { collection: 'disponibilidades' }
)

export default model<IDisponibilidad>('Disponibilidad', disponibilidadSchema)