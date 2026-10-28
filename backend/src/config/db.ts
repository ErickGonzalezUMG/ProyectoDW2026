import mongoose from 'mongoose';

async function conectarDB(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', (error as Error).message);
    process.exit(1);
  }
}

export default conectarDB;