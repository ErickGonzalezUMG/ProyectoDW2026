import { Router } from 'express'
import type { Request, Response } from 'express'
import Categoria from '../models/Categoria'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import { soloAdmin } from '../middleware/soloAdmin'

const router = Router()

router.get('/', validarToken, async (_req: Request, res: Response): Promise<void> => {
  const categorias = await Categoria.find().sort({ nombre: 1 })
  res.json({ categorias })
})

router.post('/', validarToken, soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const { nombre, padre } = req.body as { nombre?: string; padre?: string | null }

  if (!nombre || !nombre.trim()) {
    res.status(400).json({ error: 'nombre_requerido' })
    return
  }

  const categoria = await Categoria.create({ nombre: nombre.trim(), padre: padre || null })
  res.status(201).json({ categoria })
})

router.put('/:id', validarToken, soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const { nombre } = req.body as { nombre?: string }

  if (!nombre || !nombre.trim()) {
    res.status(400).json({ error: 'nombre_requerido' })
    return
  }

  const categoria = await Categoria.findByIdAndUpdate(
    req.params.id,
    { nombre: nombre.trim() },
    { new: true }
  )

  if (!categoria) {
    res.status(404).json({ error: 'no_encontrada' })
    return
  }

  res.json({ categoria })
})

router.delete('/:id', validarToken, soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)

  const tieneHijas = await Categoria.exists({ padre: id })
  if (tieneHijas) {
    res.status(400).json({ error: 'tiene_subcategorias' })
    return
  }

  const enUso = await Usuario.exists({ categorias: { $in: [id] } })
  if (enUso) {
    res.status(400).json({ error: 'categoria_en_uso' })
    return
  }

  await Categoria.findByIdAndDelete(id)
  res.json({ ok: true })
})

export default router