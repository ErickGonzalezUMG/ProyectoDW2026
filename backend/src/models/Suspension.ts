import { Schema, model, Types } from 'mongoose'

export interface ISuspension {
  usuario: Types.ObjectId
  motivo: string
  denuncia: Types.ObjectId | null
  activa: boolean
  createdAt?: Date
}

const suspensionSchema = new Schema<ISuspension>(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    motivo: { type: String, required: true, trim: true, maxlength: 500 },
    denuncia: { type: Schema.Types.ObjectId, ref: 'Denuncia', default: null },
    activa: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default model<ISuspension>('Suspension', suspensionSchema)