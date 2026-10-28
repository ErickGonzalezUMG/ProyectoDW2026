import { Router } from 'express'
import type { Response } from 'express'
import { Types } from 'mongoose'
import Disponibilidad from '../models/Disponibilidad'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'
import { permitirRoles } from '../middleware/permitirRoles'

const router = Router()

interface Bloque {
  diaSemana?: number
  horaInicio?: number
  horaFin?: number
}

function entero(valor: unknown, min: number, max: number): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max
}

function validarBloques(bloques: Bloque[]): string | null {
  for (const b of bloques) {
    if (!entero(b.diaSemana, 0, 6)) return 'dia_invalido'
    if (!entero(b.horaInicio, 0, 23)) return 'hora_inicio_invalida'
    if (!entero(b.horaFin, 1, 24)) return 'hora_fin_invalida'
    if ((b.horaFin as number) <= (b.horaInicio as number)) return 'rango_invalido'
  }

  const ordenados = [...bloques].sort(
    (a, b) =>
      (a.diaSemana as number) - (b.diaSemana as number) ||
      (a.horaInicio as number) - (b.horaInicio as number)
  )

  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]
    const actual = ordenados[i]
    if (
      anterior.diaSemana === actual.diaSemana &&
      (anterior.horaFin as number) > (actual.horaInicio as number)
    ) {
      return 'bloques_traslapados'
    }
  }

  return null
}

router.use(validarToken)

router.get('/tutor/:id', async (req: RequestAutenticado, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }
  const bloques = await Disponibilidad.find({ tutor: id }).sort({ diaSemana: 1, horaInicio: 1 })
  res.json({ bloques })
})

router.get('/mia', permitirRoles('tutor', 'admin'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const bloques = await Disponibilidad.find({ tutor: req.usuarioId }).sort({ diaSemana: 1, horaInicio: 1 })
  res.json({ bloques })
})

router.put('/', permitirRoles('tutor', 'admin'), async (req: RequestAutenticado, res: Response): Promise<void> => {
  const { bloques } = req.body as { bloques?: Bloque[] }

  if (!Array.isArray(bloques)) {
    res.status(400).json({ error: 'bloques_requeridos' })
    return
  }

  const error = validarBloques(bloques)
  if (error) {
    res.status(400).json({ error })
    return
  }

  const tutor = new Types.ObjectId(String(req.usuarioId))

  await Disponibilidad.deleteMany({ tutor })
  await Disponibilidad.insertMany(
    bloques.map(b => ({
      tutor,
      diaSemana: b.diaSemana as number,
      horaInicio: b.horaInicio as number,
      horaFin: b.horaFin as number,
    }))
  )

  const guardados = await Disponibilidad.find({ tutor }).sort({ diaSemana: 1, horaInicio: 1 })
  res.json({ bloques: guardados })
})

export default router