import { Schema, model, Types } from 'mongoose'

export interface IResena {
  tutoria: Types.ObjectId
  tutor: Types.ObjectId
  estudiante: Types.ObjectId
  calificacion: number
  comentario: string
}

const resenaSchema = new Schema<IResena>(
  {
    tutoria: { type: Schema.Types.ObjectId, ref: 'Tutoria', required: true, unique: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estudiante: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
)

export default model<IResena>('Resena', resenaSchema)