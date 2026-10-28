import { Schema, model, Types } from 'mongoose';

export interface IUsuario {
  nombre: string;
  correo: string;
  foto: string;
  rol: 'estudiante' | 'tutor' | 'admin';
  perfilCompleto: boolean;
  telefono: string;
  genero: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  dpi: string;
  categorias: Types.ObjectId[];
  hojaVida: string;
  biografia: string;
  tarifaBase: number;
  aprobado: boolean;
  estado: 'activo' | 'suspendido';
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombre: { type: String, required: true },
    correo: { type: String, required: true, unique: true, lowercase: true },
    foto: { type: String, default: '' },
    rol: { type: String, enum: ['estudiante', 'tutor', 'admin'], default: 'estudiante' },
    perfilCompleto: { type: Boolean, default: false },
    telefono: { type: String, default: '' },
    genero: { type: String, default: '' },
    direccion: { type: String, default: '' },
    latitud: { type: Number, default: null },
    longitud: { type: Number, default: null },
    dpi: { type: String, default: '' },
    categorias: [{ type: Schema.Types.ObjectId, ref: 'Categoria' }],
    hojaVida: { type: String, default: '' },
    biografia: { type: String, default: '' },
    tarifaBase: { type: Number, default: 0 },
    aprobado: { type: Boolean, default: false },
    estado: { type: String, enum: ['activo', 'suspendido'], default: 'activo' },
  },
  { timestamps: true }
);

export default model<IUsuario>('Usuario', usuarioSchema);