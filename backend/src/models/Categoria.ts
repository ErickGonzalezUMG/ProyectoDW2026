import { Schema, model, Types } from 'mongoose';

export interface ICategoria {
  nombre: string;
  padre: Types.ObjectId | null;
}

const categoriaSchema = new Schema<ICategoria>(
  {
    nombre: { type: String, required: true },
    padre: { type: Schema.Types.ObjectId, ref: 'Categoria', default: null },
  },
  { timestamps: true }
);

export default model<ICategoria>('Categoria', categoriaSchema);