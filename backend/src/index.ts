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
import disponibilidadRoutes from './routes/disponibilidad'
import tutoriasRoutes from './routes/tutorias'
import suscripcionesRoutes from './routes/suscripciones'
import resenasRoutes from './routes/resenas'
import denunciasRoutes from './routes/denuncias'
import apelacionesRoutes from './routes/apelaciones'
import moderacionRoutes from './routes/moderacion'

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
app.use('/api/disponibilidad', disponibilidadRoutes)
app.use('/api/tutorias', tutoriasRoutes)
app.use('/api/suscripciones', suscripcionesRoutes)
app.use('/api/resenas', resenasRoutes)
app.use('/api/denuncias', denunciasRoutes)
app.use('/api/apelaciones', apelacionesRoutes)
app.use('/api/moderacion', moderacionRoutes)

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`)
})