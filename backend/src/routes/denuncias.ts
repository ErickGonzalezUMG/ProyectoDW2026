import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
import Denuncia from '../models/Denuncia'
import Tutoria from '../models/Tutoria'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'

const TIPOS = ['inasistencia', 'conducta_inapropiada', 'cobros_indebidos'] as const

const router = Router()

router.use(validarToken)

router.post('/', permitirRoles('estudiante', 'tutor'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as { tutoria?: string; tipo?: string; motivo?: string }

  if (!d.tutoria || !Types.ObjectId.isValid(d.tutoria)) {
    res.status(400).json({ error: 'tutoria_invalida' })
    return
  }

  const tipo = TIPOS.find(t => t === d.tipo)
  if (!tipo) {
    res.status(400).json({ error: 'tipo_invalido' })
    return
  }

  const motivo = typeof d.motivo === 'string' ? d.motivo.trim() : ''
  if (motivo.length < 10 || motivo.length > 500) {
    res.status(400).json({ error: 'motivo_invalido' })
    return
  }

  const tutoria = await Tutoria.findById(d.tutoria)
  if (!tutoria) {
    res.status(404).json({ error: 'tutoria_no_encontrada' })
    return
  }

  const yo = String(req.usuarioId)
  const esTutor = String(tutoria.tutor) === yo
  const esEstudiante = String(tutoria.estudiante) === yo

  if (!esTutor && !esEstudiante) {
    res.status(403).json({ error: 'no_permitido' })
    return
  }

  const aprobada = tutoria.estado === 'aprobada' || tutoria.estado === 'completada'
  if (!aprobada || tutoria.fin.getTime() > Date.now()) {
    res.status(409).json({ error: 'clase_no_realizada' })
    return
  }

  const denunciante = new Types.ObjectId(yo)

  if (await Denuncia.exists({ tutoria: tutoria._id, denunciante })) {
    res.status(409).json({ error: 'ya_denunciada' })
    return
  }

  const denuncia = await Denuncia.create({
    tutoria: tutoria._id,
    denunciante,
    denunciado: esTutor ? tutoria.estudiante : tutoria.tutor,
    tipo,
    motivo,
  })

  res.status(201).json({ denuncia })
})

export default router