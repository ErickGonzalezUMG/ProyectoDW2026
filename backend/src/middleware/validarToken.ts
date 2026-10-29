import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario'

export interface PayloadToken {
  id: string
  rol: 'estudiante' | 'tutor' | 'admin'
}

export interface RequestAutenticado extends Request {
  usuarioId?: string
  usuarioRol?: 'estudiante' | 'tutor' | 'admin'
}

const RUTAS_PARA_SUSPENDIDOS = ['/api/auth/yo', '/api/apelaciones']

function permitidaParaSuspendido(url: string): boolean {
  const ruta = url.split('?')[0]
  return RUTAS_PARA_SUSPENDIDOS.some(r => ruta === r || ruta.startsWith(r + '/'))
}

export async function validarToken(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  const encabezado = req.headers.authorization

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    res.status(401).json({ error: 'token_requerido' })
    return
  }

  const token = encabezado.split(' ')[1]
  let payload: PayloadToken

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as PayloadToken
  } catch (error) {
    const expirado = error instanceof Error && error.name === 'TokenExpiredError'
    res.status(401).json({ error: expirado ? 'token_expirado' : 'token_invalido' })
    return
  }

  const usuario = await Usuario.findById(payload.id).select('estado')
  if (!usuario) {
    res.status(401).json({ error: 'token_invalido' })
    return
  }

  if (usuario.estado === 'suspendido' && !permitidaParaSuspendido(req.originalUrl)) {
    res.status(403).json({ error: 'cuenta_suspendida' })
    return
  }

  req.usuarioId = payload.id
  req.usuarioRol = payload.rol
  next()
}