import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
import Resena from '../models/Resena'
import Tutoria from '../models/Tutoria'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'

const router = Router()

interface DatosResena {
  tutoria?: string
  calificacion?: number
  comentario?: string
}

router.use(validarToken)

router.get('/mias', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const filtro: Record<string, unknown> = {}

  if (req.usuarioRol === 'tutor') {
    filtro.tutor = req.usuarioId
  } else if (req.usuarioRol === 'estudiante') {
    filtro.estudiante = req.usuarioId
  }

  const resenas = await Resena.find(filtro)
  res.json({ resenas })
})

router.post('/', permitirRoles('estudiante', 'admin'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosResena

  if (!d.tutoria || !Types.ObjectId.isValid(d.tutoria)) {
    res.status(400).json({ error: 'tutoria_invalida' })
    return
  }

  if (
    typeof d.calificacion !== 'number' ||
    !Number.isInteger(d.calificacion) ||
    d.calificacion < 1 ||
    d.calificacion > 5
  ) {
    res.status(400).json({ error: 'calificacion_invalida' })
    return
  }

  const comentario = typeof d.comentario === 'string' ? d.comentario.trim() : ''
  if (comentario.length > 500) {
    res.status(400).json({ error: 'comentario_largo' })
    return
  }

  const tutoria = await Tutoria.findById(d.tutoria)
  if (!tutoria) {
    res.status(404).json({ error: 'tutoria_no_encontrada' })
    return
  }

  if (String(tutoria.estudiante) !== String(req.usuarioId)) {
    res.status(403).json({ error: 'no_permitido' })
    return
  }

  const aprobada = tutoria.estado === 'aprobada' || tutoria.estado === 'completada'
  if (!aprobada || tutoria.fin.getTime() > Date.now()) {
    res.status(409).json({ error: 'clase_no_realizada' })
    return
  }

  if (await Resena.exists({ tutoria: tutoria._id })) {
    res.status(409).json({ error: 'ya_calificada' })
    return
  }

  try {
    const resena = await Resena.create({
      tutoria: tutoria._id,
      tutor: tutoria.tutor,
      estudiante: tutoria.estudiante,
      calificacion: d.calificacion,
      comentario,
    })
    res.status(201).json({ resena })
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'ya_calificada' })
      return
    }
    throw err
  }
})

export default router