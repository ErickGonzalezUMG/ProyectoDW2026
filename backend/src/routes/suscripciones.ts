import { Router } from 'express'
import type { Response } from 'express'
import Suscripcion from '../models/Suscripcion'
import Tutoria from '../models/Tutoria'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'
import { redondear } from '../utils/geo'
import {
  armarHorario,
  cargarContexto,
  distanciaDeTraslado,
  esError,
  precioSesion,
  validarHorario,
} from '../utils/agenda'
import type { Horario, Precio } from '../utils/agenda'

const router = Router()

interface SesionBody {
  diaSemana?: number
  horaInicio?: number
  horas?: number
}

interface DatosSuscripcion {
  oferta?: string
  semanas?: number
  fechaInicio?: string
  sesiones?: SesionBody[]
}

interface SesionGenerada {
  fecha: string
  horario: Horario
  precio: Precio
}

function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

function primerDia(fecha: string, diaSemana: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const base = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()
  return sumarDias(fecha, (diaSemana - base + 7) % 7)
}

router.use(validarToken)

router.post('/', permitirRoles('estudiante', 'admin'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosSuscripcion

  if (d.semanas !== 4 && d.semanas !== 8) {
    res.status(400).json({ error: 'semanas_invalidas' })
    return
  }

  const fechaInicio = d.fechaInicio ?? ''
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) ||
    isNaN(new Date(`${fechaInicio}T00:00:00Z`).getTime())
  ) {
    res.status(400).json({ error: 'fecha_invalida' })
    return
  }

  const sesiones = d.sesiones
  if (!Array.isArray(sesiones) || sesiones.length < 1 || sesiones.length > 5) {
    res.status(400).json({ error: 'sesiones_invalidas' })
    return
  }

  const dias = new Set<number>()
  for (const s of sesiones) {
    const dia = s.diaSemana
    if (typeof dia !== 'number' || !Number.isInteger(dia) || dia < 0 || dia > 6 || dias.has(dia)) {
      res.status(400).json({ error: 'sesiones_invalidas' })
      return
    }
    dias.add(dia)
  }

  const ctx = await cargarContexto(String(d.oferta ?? ''), String(req.usuarioId))
  if (esError(ctx)) {
    res.status(ctx.status).json({ error: ctx.error })
    return
  }

  const distancia = await distanciaDeTraslado(ctx)
  if (typeof distancia !== 'number') {
    res.status(distancia.status).json({ error: distancia.error })
    return
  }

  const lista: SesionGenerada[] = []

  for (let semana = 0; semana < d.semanas; semana++) {
    for (const s of sesiones) {
      const fecha = sumarDias(primerDia(fechaInicio, s.diaSemana as number), semana * 7)
      const horario = armarHorario(fecha, s.horaInicio, s.horas)
      if (esError(horario)) {
        res.status(horario.status).json({ error: horario.error, fecha })
        return
      }
      lista.push({ fecha, horario, precio: precioSesion(ctx.oferta, distancia, horario.horas) })
    }
  }

  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i].horario
      const b = lista[j].horario
      if (a.inicio < b.fin && a.fin > b.inicio) {
        res.status(409).json({ error: 'sesiones_traslapadas', fecha: lista[j].fecha })
        return
      }
    }
  }

  for (const item of lista) {
    const conflicto = await validarHorario(ctx.tutor._id, ctx.estudiante._id, item.horario)
    if (conflicto) {
      res.status(conflicto.status).json({ error: conflicto.error, fecha: item.fecha })
      return
    }
  }

  const total = redondear(lista.reduce((suma, item) => suma + item.precio.total, 0))

  const suscripcion = await Suscripcion.create({
    oferta: ctx.oferta._id,
    tutor: ctx.tutor._id,
    estudiante: ctx.estudiante._id,
    semanas: d.semanas,
    fechaInicio,
    sesiones: sesiones.map(s => ({
      diaSemana: s.diaSemana as number,
      horaInicio: s.horaInicio as number,
      horas: s.horas as number,
    })),
    total,
  })

  await Tutoria.insertMany(
    lista.map(item => ({
      oferta: ctx.oferta._id,
      tutor: ctx.tutor._id,
      estudiante: ctx.estudiante._id,
      inicio: item.horario.inicio,
      fin: item.horario.fin,
      suscripcion: suscripcion._id,
      tarifaHora: ctx.oferta.tarifaHora,
      distanciaKm: item.precio.distanciaKm,
      traslado: item.precio.traslado,
      total: item.precio.total,
    }))
  )

  res.status(201).json({ suscripcion, tutorias: lista.length })
})

export default router