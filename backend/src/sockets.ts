import type { Server as ServidorHttp } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import Usuario from './models/Usuario'
import type { PayloadToken } from './middleware/validarToken'

let io: Server | null = null

// Tiempo máximo de un setTimeout (≈ 24 días); evita desbordes con tokens muy largos
const MAXIMO_TIMEOUT = 2_000_000_000

export function iniciarSockets(servidor: ServidorHttp): void {
  io = new Server(servidor, { cors: { origin: '*' } })

  // Autenticación: el cliente envía su JWT en el handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string' || token === '') {
      next(new Error('token_requerido'))
      return
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as PayloadToken & { exp?: number }
      const usuario = await Usuario.findById(payload.id).select('estado')
      if (!usuario || usuario.estado === 'suspendido') {
        next(new Error('no_autorizado'))
        return
      }
      socket.data.usuarioId = payload.id
      socket.data.exp = payload.exp
      next()
    } catch {
      next(new Error('token_invalido'))
    }
  })

  io.on('connection', socket => {
    const usuarioId = String(socket.data.usuarioId)
    // Sala personal: todo lo dirigido a este usuario llega por aquí
    void socket.join(`usuario:${usuarioId}`)

    // Cuando el token vence, se cierra la conexión (igual que las peticiones REST)
    const exp = socket.data.exp as number | undefined
    if (exp) {
      const ms = Math.min(Math.max(exp * 1000 - Date.now(), 0), MAXIMO_TIMEOUT)
      const temporizador = setTimeout(() => socket.disconnect(true), ms)
      socket.on('disconnect', () => clearTimeout(temporizador))
    }
  })
}

export function emitirA(usuarioId: string, evento: string, datos: unknown): void {
  io?.to(`usuario:${usuarioId}`).emit(evento, datos)
}
