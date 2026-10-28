import { Router } from 'express'
import type { Response } from 'express'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'

const router = Router()

interface DatosOnboarding {
  rol?: string
  telefono?: string
  genero?: string
  direccion?: string
  latitud?: number
  longitud?: number
  dpi?: string
  categorias?: string[]
  hojaVida?: string
  biografia?: string
  tarifaBase?: number
}

router.put('/perfil', validarToken, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosOnboarding

  if (d.rol !== 'estudiante' && d.rol !== 'tutor') {
    res.status(400).json({ error: 'rol_invalido' })
    return
  }

  if (!d.telefono || !d.genero || !d.direccion || !d.dpi) {
    res.status(400).json({ error: 'datos_incompletos' })
    return
  }

  if (typeof d.latitud !== 'number' || typeof d.longitud !== 'number') {
    res.status(400).json({ error: 'ubicacion_requerida' })
    return
  }

  if (!d.categorias || d.categorias.length === 0) {
    res.status(400).json({ error: 'categorias_requeridas' })
    return
  }

  if (d.rol === 'tutor') {
    if (!d.hojaVida || !d.biografia || !d.tarifaBase || d.tarifaBase <= 0) {
      res.status(400).json({ error: 'datos_tutor_incompletos' })
      return
    }
  }

  const usuario = await Usuario.findById(req.usuarioId)

  if (!usuario) {
    res.status(401).json({ error: 'token_invalido' })
    return
  }

  if (usuario.rol === 'admin') {
    res.status(403).json({ error: 'no_permitido' })
    return
  }

  usuario.rol = d.rol
  usuario.telefono = d.telefono
  usuario.genero = d.genero
  usuario.direccion = d.direccion
  usuario.latitud = d.latitud
  usuario.longitud = d.longitud
  usuario.dpi = d.dpi
  usuario.categorias = d.categorias as any
  usuario.hojaVida = d.rol === 'tutor' ? (d.hojaVida as string) : ''
  usuario.biografia = d.rol === 'tutor' ? (d.biografia as string) : ''
  usuario.tarifaBase = d.rol === 'tutor' ? (d.tarifaBase as number) : 0
  usuario.aprobado = d.rol === 'estudiante'
  usuario.perfilCompleto = true

  await usuario.save()

  res.json({
    usuario: {
      id: String(usuario._id),
      nombre: usuario.nombre,
      correo: usuario.correo,
      foto: usuario.foto,
      rol: usuario.rol,
      perfilCompleto: usuario.perfilCompleto,
      aprobado: usuario.aprobado,
    },
  })
})

export default router