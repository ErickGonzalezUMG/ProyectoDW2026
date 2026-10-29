import { Schema, model, Types } from 'mongoose'

export interface IMensaje {
  de: Types.ObjectId
  para: Types.ObjectId
  texto: string
  leidoEn: Date | null
}

const mensajeSchema = new Schema<IMensaje>(
  {
    de: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    para: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    texto: { type: String, required: true, trim: true, maxlength: 1000 },
    leidoEn: { type: Date, default: null },
  },
  { timestamps: true }
)

// Acelera el historial de una conversación y el conteo de mensajes sin leer
mensajeSchema.index({ de: 1, para: 1, createdAt: 1 })
mensajeSchema.index({ para: 1, leidoEn: 1 })

export default model<IMensaje>('Mensaje', mensajeSchema)
