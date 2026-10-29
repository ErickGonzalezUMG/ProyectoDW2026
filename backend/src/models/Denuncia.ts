import { Schema, model, Types } from 'mongoose'

export type EstadoDenuncia = 'pendiente' | 'resuelta' | 'descartada'

export type TipoDenuncia = 'inasistencia' | 'conducta_inapropiada' | 'cobros_indebidos'

export interface IDenuncia {
  tutoria: Types.ObjectId
  denunciante: Types.ObjectId
  denunciado: Types.ObjectId
  tipo?: TipoDenuncia
  motivo: string
  estado: EstadoDenuncia
}

const denunciaSchema = new Schema<IDenuncia>(
  {
    tutoria: { type: Schema.Types.ObjectId, ref: 'Tutoria', required: true },
    denunciante: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    denunciado: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipo: { type: String, enum: ['inasistencia', 'conducta_inapropiada', 'cobros_indebidos'] },
    motivo: { type: String, required: true, trim: true, maxlength: 500 },
    estado: { type: String, enum: ['pendiente', 'resuelta', 'descartada'], default: 'pendiente' },
  },
  { timestamps: true }
)

denunciaSchema.index({ tutoria: 1, denunciante: 1 }, { unique: true })

export default model<IDenuncia>('Denuncia', denunciaSchema)