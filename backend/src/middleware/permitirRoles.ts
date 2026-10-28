import type { Response, NextFunction } from 'express'
import type { RequestAutenticado } from './validarToken'

export function permitirRoles(...roles: string[]) {
  return (req: RequestAutenticado, res: Response, next: NextFunction): void => {
    if (!req.usuarioRol || !roles.includes(req.usuarioRol)) {
      res.status(403).json({ error: 'no_permitido' })
      return
    }
    next()
  }
}