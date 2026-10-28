import type { Response, NextFunction } from 'express'
import type { RequestAutenticado } from './validarToken'

export function soloAdmin(req: RequestAutenticado, res: Response, next: NextFunction): void {
  if (req.usuarioRol !== 'admin') {
    res.status(403).json({ error: 'no_permitido' })
    return
  }
  next()
}