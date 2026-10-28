import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import conectarDB from './config/db'
import authRoutes from './routes/auth'
import usuariosRoutes from './routes/usuarios'
import categoriasRoutes from './routes/categorias'
import adminRoutes from './routes/admin'
import ofertasRoutes from './routes/ofertas'
import buscarRoutes from './routes/buscar'

const app = express()

app.use(cors())
app.use(express.json())

conectarDB()

app.get('/api/salud', (_req, res) => {
  res.json({ estado: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ofertas', ofertasRoutes)
app.use('/api/buscar', buscarRoutes)

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`)
})