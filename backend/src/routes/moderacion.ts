import { Router } from 'express'
import type { Request, Response } from 'express'
import { Types } from 'mongoose'
import Denuncia from '../models/Denuncia'
import Apelacion from '../models/Apelacion'
import Suspension from '../models/Suspension'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import { soloAdmin } from '../middleware/soloAdmin'

const router = Router()

router.use(validarToken, soloAdmin)

/* ---------- Denuncias ---------- */

router.get('/denuncias', async (req: Request, res: Response): Promise<void> => {
  const filtro: Record<string, unknown> = {}
  const usuario = typeof req.query.usuario === 'string' ? req.query.usuario : ''

  if (usuario) {
    // Historial de un usuario: reportes que hizo y reportes que recibió, de cualquier estado
    if (!Types.ObjectId.isValid(usuario)) {
      res.status(400).json({ error: 'id_invalido' })
      return
    }
    filtro.$or = [{ denunciado: usuario }, { denunciante: usuario }]
  } else if (req.query.estado !== 'todas') {
    filtro.estado = 'pendiente'
  }

  const denuncias = await Denuncia.find(filtro)
    .populate('denunciante', 'nombre correo rol')
    .populate('denunciado', 'nombre correo rol estado')
    .populate('tutoria', 'inicio fin')
    .sort({ createdAt: -1 })

  res.json({ denuncias })
})

router.put('/denuncias/:id', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { accion, motivo } = req.body as { accion?: string; motivo?: string }

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const denuncia = await Denuncia.findById(id)
  if (!denuncia) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  if (denuncia.estado !== 'pendiente') {
    res.status(409).json({ error: 'ya_resuelta' })
    return
  }

  if (accion === 'descartar') {
    denuncia.estado = 'descartada'
    await denuncia.save()
    res.json({ denuncia })
    return
  }

  if (accion !== 'suspender') {
    res.status(400).json({ error: 'accion_invalida' })
    return
  }

  const texto = typeof motivo === 'string' ? motivo.trim() : ''
  if (texto.length < 5 || texto.length > 500) {
    res.status(400).json({ error: 'motivo_invalido' })
    return
  }

  const usuario = await Usuario.findById(denuncia.denunciado)
  if (!usuario) {
    res.status(404).json({ error: 'usuario_no_encontrado' })
    return
  }

  if (usuario.rol === 'admin') {
    res.status(400).json({ error: 'no_se_puede_suspender_admin' })
    return
  }

  if (usuario.estado !== 'suspendido') {
    usuario.estado = 'suspendido'
    await usuario.save()
    await Suspension.create({ usuario: usuario._id, motivo: texto, denuncia: denuncia._id })
  }

  denuncia.estado = 'resuelta'
  await denuncia.save()

  res.json({ denuncia })
})

/* ---------- Apelaciones ---------- */

router.get('/apelaciones', async (req: Request, res: Response): Promise<void> => {
  const filtro: Record<string, unknown> = {}
  if (req.query.estado !== 'todas') {
    filtro.estado = 'pendiente'
  }

  const apelaciones = await Apelacion.find(filtro)
    .populate('usuario', 'nombre correo rol foto')
    .populate('suspension', 'motivo createdAt')
    .sort({ createdAt: -1 })

  res.json({ apelaciones })
})

router.put('/apelaciones/:id', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { accion } = req.body as { accion?: string }

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const apelacion = await Apelacion.findById(id)
  if (!apelacion) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  if (apelacion.estado !== 'pendiente') {
    res.status(409).json({ error: 'ya_resuelta' })
    return
  }

  if (accion === 'rechazar') {
    apelacion.estado = 'rechazada'
    await apelacion.save()
    res.json({ apelacion })
    return
  }

  if (accion !== 'aceptar') {
    res.status(400).json({ error: 'accion_invalida' })
    return
  }

  await Usuario.findByIdAndUpdate(apelacion.usuario, { estado: 'activo' })
  await Suspension.updateMany({ usuario: apelacion.usuario, activa: true }, { activa: false })

  apelacion.estado = 'aceptada'
  await apelacion.save()

  res.json({ apelacion })
})

/* ---------- Usuarios (suspensión directa) ---------- */

router.get('/usuarios', async (_req: Request, res: Response): Promise<void> => {
  const usuarios = await Usuario.find({}, 'nombre correo rol estado foto')
    .sort({ nombre: 1 })
    .limit(300)

  res.json({ usuarios })
})

router.put('/usuarios/:id/suspender', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { motivo } = req.body as { motivo?: string }

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const texto = typeof motivo === 'string' ? motivo.trim() : ''
  if (texto.length < 5 || texto.length > 500) {
    res.status(400).json({ error: 'motivo_invalido' })
    return
  }

  const usuario = await Usuario.findById(id)
  if (!usuario) {
    res.status(404).json({ error: 'usuario_no_encontrado' })
    return
  }

  if (usuario.rol === 'admin') {
    res.status(400).json({ error: 'no_se_puede_suspender_admin' })
    return
  }

  if (usuario.estado === 'suspendido') {
    res.status(409).json({ error: 'ya_suspendido' })
    return
  }

  usuario.estado = 'suspendido'
  await usuario.save()
  await Suspension.create({ usuario: usuario._id, motivo: texto, denuncia: null })

  res.json({ usuario: { _id: usuario._id, estado: usuario.estado } })
})

router.put('/usuarios/:id/reactivar', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const usuario = await Usuario.findById(id)
  if (!usuario) {
    res.status(404).json({ error: 'usuario_no_encontrado' })
    return
  }

  if (usuario.estado !== 'suspendido') {
    res.status(409).json({ error: 'no_esta_suspendido' })
    return
  }

  usuario.estado = 'activo'
  await usuario.save()
  await Suspension.updateMany({ usuario: usuario._id, activa: true }, { activa: false })
  await Apelacion.updateMany({ usuario: usuario._id, estado: 'pendiente' }, { estado: 'aceptada' })

  res.json({ usuario: { _id: usuario._id, estado: usuario.estado } })
})

export default router