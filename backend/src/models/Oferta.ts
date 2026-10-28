import { Schema, model, Types } from 'mongoose'

export type Modalidad = 'virtual' | 'casa_tutor' | 'casa_estudiante'

export interface IOferta {
  tutor: Types.ObjectId
  categoria: Types.ObjectId
  titulo: string
  descripcion: string
  modalidad: Modalidad
  tarifaHora: number
  tarifaKm: number
  activa: boolean
}

const ofertaSchema = new Schema<IOferta>(
  {
    tutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    categoria: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    modalidad: {
      type: String,
      enum: ['virtual', 'casa_tutor', 'casa_estudiante'],
      required: true,
    },
    tarifaHora: { type: Number, required: true, min: 1 },
    tarifaKm: { type: Number, default: 0, min: 0 },
    activa: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default model<IOferta>('Oferta', ofertaSchema)