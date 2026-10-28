import { Router } from 'express'
import type { Response } from 'express'
import Tutoria from '../models/Tutoria'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'
import {
  armarHorario,
  cargarContexto,
  distanciaDeTraslado,
  esError,
  precioSesion,
  validarHorario,
} from '../utils/agenda'

const router = Router()

interface DatosTutoria {
  oferta?: string
  fecha?: string
  horaInicio?: number
  horas?: number
}

router.use(validarToken)

router.post('/', permitirRoles('estudiante', 'admin'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosTutoria

  const horario = armarHorario(d.fecha ?? '', d.horaInicio, d.horas)
  if (esError(horario)) {
    res.status(horario.status).json({ error: horario.error })
    return
  }

  const ctx = await cargarContexto(String(d.oferta ?? ''), String(req.usuarioId))
  if (esError(ctx)) {
    res.status(ctx.status).json({ error: ctx.error })
    return
  }

  const conflicto = await validarHorario(ctx.tutor._id, ctx.estudiante._id, horario)
  if (conflicto) {
    res.status(conflicto.status).json({ error: conflicto.error })
    return
  }

  const distancia = await distanciaDeTraslado(ctx)
  if (typeof distancia !== 'number') {
    res.status(distancia.status).json({ error: distancia.error })
    return
  }

  const precio = precioSesion(ctx.oferta, distancia, horario.horas)

  const tutoria = await Tutoria.create({
    oferta: ctx.oferta._id,
    tutor: ctx.tutor._id,
    estudiante: ctx.estudiante._id,
    inicio: horario.inicio,
    fin: horario.fin,
    tarifaHora: ctx.oferta.tarifaHora,
    distanciaKm: precio.distanciaKm,
    traslado: precio.traslado,
    total: precio.total,
  })

  res.status(201).json({ tutoria })
})

export default router