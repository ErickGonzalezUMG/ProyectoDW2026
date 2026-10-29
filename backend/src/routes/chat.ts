import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
import Mensaje from '../models/Mensaje'
import Tutoria from '../models/Tutoria'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'
import { emitirA } from '../sockets'

const router = Router()

router.use(validarToken, permitirRoles('estudiante', 'tutor'))

interface InterlocutorLean {
  _id: Types.ObjectId
  nombre: string
  foto: string
  rol: 'estudiante' | 'tutor' | 'admin'
  aprobado: boolean
  estado: 'activo' | 'suspendido'
}

interface Relacion {
  otro: InterlocutorLean | null
  permitida: boolean
  hayHistorial: boolean
}

/*
 * Reglas del chat:
 *  - Solo entre un estudiante y un tutor (nunca con administradores).
 *  - El estudiante puede escribir a cualquier tutor aprobado.
 *  - El tutor puede responder a quien le escribió o tenga una clase con él.
 */
async function evaluarRelacion(yoId: string, yoRol: string, otroId: string): Promise<Relacion> {
  const vacio: Relacion = { otro: null, permitida: false, hayHistorial: false }
  if (!Types.ObjectId.isValid(otroId) || otroId === yoId) return vacio

  const otro = await Usuario.findById(otroId).select('nombre foto rol aprobado estado').lean<InterlocutorLean>()
  if (!otro || otro.rol === 'admin' || otro.rol === yoRol) return vacio

  const yo = new Types.ObjectId(yoId)
  const el = new Types.ObjectId(otroId)

  const hayHistorial = Boolean(await Mensaje.exists({ $or: [{ de: yo, para: el }, { de: el, para: yo }] }))

  let permitida = false
  if (yoRol === 'estudiante') {
    permitida = otro.aprobado || hayHistorial
  } else {
    permitida = hayHistorial || Boolean(await Tutoria.exists({ tutor: yo, estudiante: el }))
  }

  return { otro, permitida, hayHistorial }
}

function aPublico(m: { _id: Types.ObjectId; de: Types.ObjectId; para: Types.ObjectId; texto: string; leidoEn: Date | null; createdAt?: Date }) {
  return {
    _id: String(m._id),
    de: String(m.de),
    para: String(m.para),
    texto: m.texto,
    leidoEn: m.leidoEn,
    createdAt: m.createdAt,
  }
}

// Lista de conversaciones con último mensaje y cantidad sin leer
router.get('/conversaciones', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const yo = new Types.ObjectId(String(req.usuarioId))

  const grupos = await Mensaje.aggregate<{
    _id: Types.ObjectId
    ultimo: { texto: string; createdAt: Date; de: Types.ObjectId }
    sinLeer: number
  }>([
    { $match: { $or: [{ de: yo }, { para: yo }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$de', yo] }, '$para', '$de'] },
        ultimo: { $first: { texto: '$texto', createdAt: '$createdAt', de: '$de' } },
        sinLeer: {
          $sum: { $cond: [{ $and: [{ $eq: ['$para', yo] }, { $eq: ['$leidoEn', null] }] }, 1, 0] },
        },
      },
    },
    { $sort: { 'ultimo.createdAt': -1 } },
  ])

  const usuarios = await Usuario.find({ _id: { $in: grupos.map(g => g._id) } })
    .select('nombre foto rol')
    .lean<{ _id: Types.ObjectId; nombre: string; foto: string; rol: string }[]>()
  const porId = new Map(usuarios.map(u => [String(u._id), u]))

  const conversaciones = grupos.map(g => {
    const u = porId.get(String(g._id))
    return {
      usuario: { _id: String(g._id), nombre: u?.nombre ?? 'Usuario eliminado', foto: u?.foto ?? '', rol: u?.rol ?? '' },
      ultimo: { texto: g.ultimo.texto, createdAt: g.ultimo.createdAt, mio: String(g.ultimo.de) === String(yo) },
      sinLeer: g.sinLeer,
    }
  })

  res.json({ conversaciones })
})

// Total de mensajes sin leer (insignia del menú)
router.get('/sin-leer', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const total = await Mensaje.countDocuments({ para: new Types.ObjectId(String(req.usuarioId)), leidoEn: null })
  res.json({ total })
})

// Historial con una persona; al abrirlo, sus mensajes quedan marcados como leídos
router.get('/con/:id', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const yoId = String(req.usuarioId)
  const otroId = String(req.params.id)

  const rel = await evaluarRelacion(yoId, String(req.usuarioRol), otroId)
  if (!rel.otro || (!rel.permitida && !rel.hayHistorial)) {
    res.status(403).json({ error: 'no_permitido' })
    return
  }

  const yo = new Types.ObjectId(yoId)
  const el = new Types.ObjectId(otroId)

  const leidos = await Mensaje.updateMany({ de: el, para: yo, leidoEn: null }, { leidoEn: new Date() })
  if (leidos.modifiedCount > 0) emitirA(otroId, 'leidos', { por: yoId })

  const mensajes = await Mensaje.find({ $or: [{ de: yo, para: el }, { de: el, para: yo }] })
    .sort({ createdAt: 1 })
    .limit(300)
    .lean()

  res.json({
    usuario: { _id: otroId, nombre: rel.otro.nombre, foto: rel.otro.foto, rol: rel.otro.rol },
    puedeEscribir: rel.permitida && rel.otro.estado === 'activo',
    mensajes: mensajes.map(aPublico),
  })
})

// Marca como leídos los mensajes de una persona (cuando llegan con la conversación abierta)
router.put('/con/:id/leer', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const yoId = String(req.usuarioId)
  const otroId = String(req.params.id)
  if (!Types.ObjectId.isValid(otroId)) {
    res.status(400).json({ error: 'usuario_invalido' })
    return
  }

  const r = await Mensaje.updateMany(
    { de: new Types.ObjectId(otroId), para: new Types.ObjectId(yoId), leidoEn: null },
    { leidoEn: new Date() }
  )
  if (r.modifiedCount > 0) emitirA(otroId, 'leidos', { por: yoId })
  res.json({ ok: true })
})

// Envía un mensaje: se guarda y se empuja en tiempo real al destinatario
router.post('/con/:id', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const yoId = String(req.usuarioId)
  const otroId = String(req.params.id)

  const d = req.body as { texto?: string }
  const texto = typeof d.texto === 'string' ? d.texto.trim() : ''
  if (texto.length < 1 || texto.length > 1000) {
    res.status(400).json({ error: 'texto_invalido' })
    return
  }

  const rel = await evaluarRelacion(yoId, String(req.usuarioRol), otroId)
  if (!rel.otro || !rel.permitida) {
    res.status(403).json({ error: 'no_permitido' })
    return
  }
  if (rel.otro.estado !== 'activo') {
    res.status(409).json({ error: 'destinatario_suspendido' })
    return
  }

  const creado = await Mensaje.create({
    de: new Types.ObjectId(yoId),
    para: new Types.ObjectId(otroId),
    texto,
  })

  const mensaje = aPublico(creado.toObject())
  emitirA(otroId, 'mensaje', mensaje)
  emitirA(yoId, 'mensaje', mensaje) // sincroniza otras pestañas del propio usuario
  res.status(201).json({ mensaje })
})

export default router
