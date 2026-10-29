import { Router } from 'express'
import type { Response } from 'express'
import Apelacion from '../models/Apelacion'
import Suspension from '../models/Suspension'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'

const router = Router()

router.use(validarToken)

router.get('/estado', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const suspension = await Suspension.findOne({ usuario: req.usuarioId, activa: true }).sort({ createdAt: -1 })
  const apelacion = suspension
    ? await Apelacion.findOne({ suspension: suspension._id }).sort({ createdAt: -1 })
    : null

  res.json({ suspension, apelacion })
})

router.post('/', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const usuario = await Usuario.findById(req.usuarioId)
  if (!usuario || usuario.estado !== 'suspendido') {
    res.status(409).json({ error: 'no_suspendido' })
    return
  }

  const { mensaje } = req.body as { mensaje?: string }
  const texto = typeof mensaje === 'string' ? mensaje.trim() : ''
  if (texto.length < 10 || texto.length > 1000) {
    res.status(400).json({ error: 'mensaje_invalido' })
    return
  }

  const encontrada = await Suspension.findOne({ usuario: usuario._id, activa: true }).sort({ createdAt: -1 })
  const suspension =
    encontrada ?? (await Suspension.create({ usuario: usuario._id, motivo: 'No se registró un motivo.' }))

  if (await Apelacion.exists({ suspension: suspension._id, estado: 'pendiente' })) {
    res.status(409).json({ error: 'apelacion_pendiente' })
    return
  }

  const apelacion = await Apelacion.create({
    usuario: usuario._id,
    suspension: suspension._id,
    mensaje: texto,
  })

  res.status(201).json({ apelacion })
})

export default router