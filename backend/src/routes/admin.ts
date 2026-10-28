import { Router } from 'express'
import type { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import { soloAdmin } from '../middleware/soloAdmin'

const router = Router()

router.use(validarToken, soloAdmin)

router.get('/tutores', async (req: Request, res: Response): Promise<void> => {
  const filtro: Record<string, unknown> = { rol: 'tutor', perfilCompleto: true }
  if (req.query.pendientes === 'true') {
    filtro.aprobado = false
  }
  const tutores = await Usuario.find(filtro).populate('categorias', 'nombre').sort({ createdAt: -1 })
  res.json({ tutores })
})

router.put('/tutores/:id/aprobar', async (req: Request, res: Response): Promise<void> => {
  const { aprobado } = req.body as { aprobado?: boolean }

  const tutor = await Usuario.findOneAndUpdate(
    { _id: req.params.id, rol: 'tutor' },
    { aprobado: aprobado !== false },
    { new: true }
  )

  if (!tutor) {
    res.status(404).json({ error: 'no_encontrado' })
    return
  }

  res.json({ tutor })
})

export default router