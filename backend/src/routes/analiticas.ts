import { Router } from 'express'
import type { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import Tutoria from '../models/Tutoria'
import Resena from '../models/Resena'
import { validarToken } from '../middleware/validarToken'
import { soloAdmin } from '../middleware/soloAdmin'

const router = Router()

router.use(validarToken, soloAdmin)

interface ClaseLeida {
  estado: string
  inicio: Date | string
  fin: Date | string
  oferta: { categoria: { nombre: string } | null } | null
}

interface FilaTutor {
  _id: string
  nombre: string
  promedio: number
  resenas: number
}

interface FilaPromedio {
  promedio: number
  total: number
}

const ORDEN_ESTADOS = ['realizada', 'proxima', 'pendiente', 'rechazada', 'cancelada']

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const ahora = Date.now()

  const [usuarios, tutoresAprobados, clasesCrudas, tutoresCrudos, promedioCrudo] = await Promise.all([
    Usuario.countDocuments(),
    Usuario.countDocuments({ rol: 'tutor', aprobado: true }),

    // Todas las clases con su oferta y categoría. Se clasifican abajo en el código
    Tutoria.find({}, 'estado inicio fin oferta')
      .populate({
        path: 'oferta',
        select: 'categoria',
        populate: { path: 'categoria', select: 'nombre' },
      })
      .lean(),

    // Calificación promedio por tutor
    Resena.aggregate<FilaTutor>([
      { $group: { _id: '$tutor', promedio: { $avg: '$calificacion' }, resenas: { $sum: 1 } } },
      {
        $lookup: {
          from: Usuario.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'tutorDoc',
        },
      },
      { $unwind: '$tutorDoc' },
      {
        $project: {
          nombre: '$tutorDoc.nombre',
          promedio: { $round: ['$promedio', 2] },
          resenas: 1,
        },
      },
      { $sort: { promedio: -1, resenas: -1 } },
    ]),

    // Promedio global de la plataforma
    Resena.aggregate<FilaPromedio>([
      { $group: { _id: null, promedio: { $avg: '$calificacion' }, total: { $sum: 1 } } },
    ]),
  ])

  const clases = clasesCrudas as unknown as ClaseLeida[]

  const conteo = new Map<string, number>()
  const acumulado = new Map<string, { horas: number; clases: number }>()

  for (const c of clases) {
    const inicio = new Date(c.inicio).getTime()
    const fin = new Date(c.fin).getTime()

    // Misma regla de "realizada" que usan el calendario, las reseñas y las denuncias
    let estadoVisible = c.estado
    if (c.estado === 'completada') {
      estadoVisible = 'realizada'
    } else if (c.estado === 'aprobada') {
      estadoVisible = fin <= ahora ? 'realizada' : 'proxima'
    }
    conteo.set(estadoVisible, (conteo.get(estadoVisible) ?? 0) + 1)

    if (estadoVisible === 'realizada') {
      const nombre = c.oferta?.categoria?.nombre ?? 'Sin categoría'
      const horas = (fin - inicio) / 3600000
      const previo = acumulado.get(nombre) ?? { horas: 0, clases: 0 }
      acumulado.set(nombre, { horas: previo.horas + horas, clases: previo.clases + 1 })
    }
  }

  const estados = ORDEN_ESTADOS.map(clave => ({ estado: clave, total: conteo.get(clave) ?? 0 }))
  const clasesRealizadas = conteo.get('realizada') ?? 0

  const categorias = Array.from(acumulado, ([categoria, v]) => ({
    categoria,
    horas: Math.round(v.horas * 10) / 10,
    clases: v.clases,
  }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 8)

  // Mejores: los 5 primeros. Peores: los 5 últimos que no estén ya en mejores
  const mejores = tutoresCrudos.slice(0, 5)
  const peores = tutoresCrudos.slice(5).slice(-5).reverse()

  const global = promedioCrudo[0]

  res.json({
    resumen: {
      usuarios,
      tutoresAprobados,
      clasesRealizadas,
      calificacionPromedio: global ? Math.round(global.promedio * 100) / 100 : null,
      resenas: global ? global.total : 0,
    },
    estados,
    categorias,
    mejores: mejores.map(t => ({ nombre: t.nombre, promedio: t.promedio, resenas: t.resenas })),
    peores: peores.map(t => ({ nombre: t.nombre, promedio: t.promedio, resenas: t.resenas })),
  })
})

export default router