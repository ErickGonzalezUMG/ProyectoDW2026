import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface PayloadToken {
  id: string
  rol: 'estudiante' | 'tutor' | 'admin'
}

export interface RequestAutenticado extends Request {
  usuarioId?: string
  usuarioRol?: 'estudiante' | 'tutor' | 'admin'
}

export function validarToken(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const encabezado = req.headers.authorization

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    res.status(401).json({ error: 'token_requerido' })
    return
  }

  const token = encabezado.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as PayloadToken
    req.usuarioId = payload.id
    req.usuarioRol = payload.rol
    next()
  } catch (error) {
    const expirado = error instanceof Error && error.name === 'TokenExpiredError'
    res.status(401).json({ error: expirado ? 'token_expirado' : 'token_invalido' })
  }
}