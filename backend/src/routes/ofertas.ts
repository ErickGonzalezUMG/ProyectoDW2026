import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import Oferta from '../models/Oferta'
import Categoria from '../models/Categoria'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'

const router = Router()

interface DatosOferta {
  categoria?: string
  titulo?: string
  descripcion?: string
  modalidad?: string
  tarifaHora?: number
  tarifaKm?: number
}

async function soloTutorAprobado(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction
): Promise<void> {
  const usuario = await Usuario.findById(req.usuarioId)

  if (!usuario || (usuario.rol !== 'tutor' && usuario.rol !== 'admin')) {
    res.status(403).json({ error: 'solo_tutores' })
    return
  }
  if (usuario.rol === 'tutor' && !usuario.aprobado) {
    res.status(403).json({ error: 'tutor_no_aprobado' })
    return
  }
  next()
}

function condicion(req: RequestAutenticado): Record<string, unknown> {
  const filtro: Record<string, unknown> = { _id: String(req.params.id) }
  if (req.usuarioRol !== 'admin') {
    filtro.tutor = String(req.usuarioId)
  }
  return filtro
}

function validar(d: DatosOferta): string | null {
  if (!d.titulo || !d.titulo.trim()) return 'titulo_requerido'
  if (!d.categoria || !Types.ObjectId.isValid(d.categoria)) return 'categoria_invalida'
  if (d.modalidad !== 'virtual' && d.modalidad !== 'casa_tutor' && d.modalidad !== 'casa_estudiante') {
    return 'modalidad_invalida'
  }
  if (typeof d.tarifaHora !== 'number' || d.tarifaHora <= 0) return 'tarifa_invalida'
  if (d.modalidad === 'casa_estudiante') {
    if (typeof d.tarifaKm !== 'number' || d.tarifaKm < 0) return 'tarifa_km_invalida'
  }
  return null
}

router.use(validarToken, permitirRoles('tutor', 'admin'))

router.get('/mias', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const filtro = req.usuarioRol === 'admin' ? {} : { tutor: req.usuarioId }
  const ofertas = await Oferta.find(filtro)
    .populate('categoria', 'nombre')
    .populate('tutor', 'nombre')
    .sort({ createdAt: -1 })
  res.json({ ofertas })
})

router.post('/', soloTutorAprobado, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosOferta
  const error = validar(d)
  if (error) {
    res.status(400).json({ error })
    return
  }

  const existe = await Categoria.exists({ _id: d.categoria })
  if (!existe) {
    res.status(400).json({ error: 'categoria_invalida' })
    return
  }

  const oferta = await Oferta.create({
    tutor: new Types.ObjectId(String(req.usuarioId)),
    categoria: new Types.ObjectId(String(d.categoria)),
    titulo: (d.titulo as string).trim(),
    descripcion: d.descripcion || '',
    modalidad: d.modalidad as 'virtual' | 'casa_tutor' | 'casa_estudiante',
    tarifaHora: d.tarifaHora as number,
    tarifaKm: d.modalidad === 'casa_estudiante' ? (d.tarifaKm as number) : 0,
  })

  res.status(201).json({ oferta })
})

router.put('/:id', soloTutorAprobado, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const d = req.body as DatosOferta
  const error = validar(d)
  if (error) {
    res.status(400).json({ error })
    return
  }

  const oferta = await Oferta.findOneAndUpdate(
    condicion(req),
    {
      categoria: String(d.categoria),
      titulo: (d.titulo as string).trim(),
      descripcion: d.descripcion || '',
      modalidad: d.modalidad,
      tarifaHora: d.tarifaHora,
      tarifaKm: d.modalidad === 'casa_estudiante' ? d.tarifaKm : 0,
    },
    { new: true }
  )

  if (!oferta) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  res.json({ oferta })
})

router.put('/:id/activa', soloTutorAprobado, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const { activa } = req.body as { activa?: boolean }

  const oferta = await Oferta.findOneAndUpdate(
    condicion(req),
    { activa: activa !== false },
    { new: true }
  )

  if (!oferta) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  res.json({ oferta })
})

router.delete('/:id', soloTutorAprobado, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const oferta = await Oferta.findOneAndDelete(condicion(req))

  if (!oferta) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  res.json({ ok: true })
})

export default router