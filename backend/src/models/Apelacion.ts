import { Schema, model, Types } from 'mongoose'

export type EstadoApelacion = 'pendiente' | 'aceptada' | 'rechazada'

export interface IApelacion {
  usuario: Types.ObjectId
  suspension: Types.ObjectId
  mensaje: string
  estado: EstadoApelacion
}

const apelacionSchema = new Schema<IApelacion>(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    suspension: { type: Schema.Types.ObjectId, ref: 'Suspension', required: true },
    mensaje: { type: String, required: true, trim: true, maxlength: 1000 },
    estado: { type: String, enum: ['pendiente', 'aceptada', 'rechazada'], default: 'pendiente' },
  },
  { timestamps: true }
)

export default model<IApelacion>('Apelacion', apelacionSchema)