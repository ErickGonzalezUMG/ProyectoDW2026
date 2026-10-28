import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
import Oferta from '../models/Oferta'
import Usuario from '../models/Usuario'
import Categoria from '../models/Categoria'
import Resena from '../models/Resena'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'

const router = Router()

interface TutorLean {
  _id: Types.ObjectId
  nombre: string
  foto: string
  biografia: string
  latitud: number | null
  longitud: number | null
  aprobado: boolean
  estado: string
  rol: string
}

interface OfertaLean {
  _id: Types.ObjectId
  titulo: string
  descripcion: string
  modalidad: 'virtual' | 'casa_tutor' | 'casa_estudiante'
  tarifaHora: number
  tarifaKm: number
  categoria: { _id: Types.ObjectId; nombre: string }
  tutor: TutorLean
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function numero(valor: unknown): number | null {
  const t = texto(valor)
  if (t === '') return null
  const n = Number(t)
  return isNaN(n) ? null : n
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = (g: number): number => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

router.get(
  '/',
  validarToken,
  permitirRoles('estudiante', 'admin'),
  async (req: RequestAutenticado, res: Response): Promise<void> => {
    const usuario = await Usuario.findById(req.usuarioId)
    if (!usuario) {
      res.status(401).json({ error: 'token_invalido' })
      return
    }

    const lat = numero(req.query.lat) ?? usuario.latitud
    const lng = numero(req.query.lng) ?? usuario.longitud
    if (lat === null || lng === null) {
      res.status(400).json({ error: 'ubicacion_requerida' })
      return
    }

    const radio = numero(req.query.radio) ?? 10
    const precioMin = numero(req.query.precioMin)
    const precioMax = numero(req.query.precioMax)
    const modalidad = texto(req.query.modalidad)
    const categoria = texto(req.query.categoria)
    const minCalificacion = numero(req.query.calificacionMin)

    const filtro: Record<string, unknown> = { activa: true }

    if (modalidad === 'virtual' || modalidad === 'casa_tutor' || modalidad === 'casa_estudiante') {
      filtro.modalidad = modalidad
    }

    if (precioMin !== null || precioMax !== null) {
      const rango: Record<string, number> = {}
      if (precioMin !== null) rango.$gte = precioMin
      if (precioMax !== null) rango.$lte = precioMax
      filtro.tarifaHora = rango
    }

    if (Types.ObjectId.isValid(categoria)) {
      const hijas = await Categoria.find({ padre: categoria }).select('_id')
      filtro.categoria = { $in: [categoria, ...hijas.map(h => String(h._id))] }
    }

    const ofertas = (await Oferta.find(filtro)
      .populate('categoria', 'nombre')
      .populate('tutor', 'nombre foto biografia latitud longitud aprobado estado rol')
      .lean()) as unknown as OfertaLean[]

    const todas = await Categoria.find().lean()
    const porId = new Map(todas.map(c => [String(c._id), c]))

    function rutaCategoria(id: string): string {
      const c = porId.get(id)
      if (!c) return ''
      const padre = c.padre ? porId.get(String(c.padre)) : undefined
      return padre ? `${padre.nombre} › ${c.nombre}` : c.nombre
    }

    const estadisticas = await Resena.aggregate<{ _id: Types.ObjectId; promedio: number; cantidad: number }>([
      { $group: { _id: '$tutor', promedio: { $avg: '$calificacion' }, cantidad: { $sum: 1 } } },
    ])
    const calificaciones = new Map(estadisticas.map(s => [String(s._id), s]))

    const resultados = []

    for (const o of ofertas) {
      const t = o.tutor
      if (!t || (!t.aprobado && t.rol !== 'admin') || t.estado !== 'activo') continue

      const stat = calificaciones.get(String(t._id))
      const promedio = stat ? redondear(stat.promedio) : 0
      const cantidad = stat ? stat.cantidad : 0
      if (minCalificacion !== null && promedio < minCalificacion) continue

      const presencial = o.modalidad !== 'virtual'
      let distancia: number | null = null

      if (presencial && t.latitud !== null && t.longitud !== null) {
        distancia = redondear(distanciaKm(lat, lng, t.latitud, t.longitud))
        if (distancia > radio) continue
      }

      const traslado =
        o.modalidad === 'casa_estudiante' && distancia !== null
          ? redondear(distancia * o.tarifaKm)
          : 0

      resultados.push({
        _id: String(o._id),
        titulo: o.titulo,
        descripcion: o.descripcion,
        modalidad: o.modalidad,
        categoria: rutaCategoria(String(o.categoria._id)),
        tarifaHora: o.tarifaHora,
        tarifaKm: o.tarifaKm,
        distanciaKm: distancia,
        traslado,
        total: redondear(o.tarifaHora + traslado),
        tutor: {
          _id: String(t._id),
          nombre: t.nombre,
          foto: t.foto,
          calificacion: promedio,
          resenas: cantidad,
          biografia: t.biografia,
          latitud: t.latitud,
          longitud: t.longitud,
        },
      })
    }

    resultados.sort((a, b) => a.total - b.total)

    res.json({ origen: { lat, lng }, resultados })
  }
)

export default router