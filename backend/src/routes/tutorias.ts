import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
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

type CambioEstado = 'aprobada' | 'rechazada' | 'cancelada'

const CAMBIOS_VALIDOS: CambioEstado[] = ['aprobada', 'rechazada', 'cancelada']

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

router.get('/mias', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const filtro: Record<string, unknown> = {}

  if (req.usuarioRol === 'tutor') {
    filtro.tutor = req.usuarioId
  } else if (req.usuarioRol === 'estudiante') {
    filtro.estudiante = req.usuarioId
  }

  const tutorias = await Tutoria.find(filtro)
    .populate('oferta', 'titulo modalidad')
    .populate('tutor', 'nombre')
    .populate('estudiante', 'nombre')
    .sort({ inicio: 1 })

  res.json({ tutorias })
})

router.put('/:id/estado', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { estado } = req.body as { estado?: CambioEstado }

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'tutoria_invalida' })
    return
  }

  if (!estado || !CAMBIOS_VALIDOS.includes(estado)) {
    res.status(400).json({ error: 'estado_invalido' })
    return
  }

  const tutoria = await Tutoria.findById(id)
  if (!tutoria) {
    res.status(404).json({ error: 'tutoria_no_encontrada' })
    return
  }

  const usuario = String(req.usuarioId)
  const esAdmin = req.usuarioRol === 'admin'
  const esTutor = String(tutoria.tutor) === usuario
  const esEstudiante = String(tutoria.estudiante) === usuario

  if (!esAdmin && !esTutor && !esEstudiante) {
    res.status(403).json({ error: 'no_permitido' })
    return
  }

  if (estado === 'aprobada' || estado === 'rechazada') {
    if (!esAdmin && !esTutor) {
      res.status(403).json({ error: 'no_permitido' })
      return
    }
    if (tutoria.estado !== 'pendiente') {
      res.status(409).json({ error: 'estado_no_permitido' })
      return
    }
  }

  if (estado === 'cancelada') {
    if (tutoria.estado !== 'pendiente' && tutoria.estado !== 'aprobada') {
      res.status(409).json({ error: 'estado_no_permitido' })
      return
    }
  }

  if (estado !== 'rechazada' && tutoria.inicio.getTime() <= Date.now()) {
    res.status(409).json({ error: 'clase_pasada' })
    return
  }

  tutoria.estado = estado
  await tutoria.save()

  res.json({ tutoria })
})

export default router