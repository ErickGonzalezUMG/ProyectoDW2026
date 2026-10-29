import { Router } from 'express'
import type { Request, Response } from 'express'
import { Types } from 'mongoose'
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
  _id: Types.ObjectId
  nombre: string
  promedio: number
  resenas: number
}

interface FilaPromedio {
  promedio: number
  total: number
}

interface ResenaLeida {
  _id: Types.ObjectId
  calificacion: number
  comentario: string
  createdAt: Date
  estudiante: { nombre: string } | null
}

const ORDEN_ESTADOS = ['realizada', 'proxima', 'pendiente', 'rechazada', 'cancelada']

// Guatemala está en UTC-6 todo el año (sin horario de verano)
const DESFASE_GT_HORAS = 6

// Devuelve el mes (AAAA-MM) actual en hora de Guatemala
function mesActual(): string {
  const gt = new Date(Date.now() - DESFASE_GT_HORAS * 3600000)
  return `${gt.getUTCFullYear()}-${String(gt.getUTCMonth() + 1).padStart(2, '0')}`
}

// Convierte "AAAA-MM" en el rango [inicio, fin) del mes en hora de Guatemala
function rangoDelMes(mes: string): { desde: number; hasta: number } {
  const [anio, numero] = mes.split('-').map(Number)
  return {
    desde: Date.UTC(anio, numero - 1, 1, DESFASE_GT_HORAS),
    hasta: Date.UTC(anio, numero, 1, DESFASE_GT_HORAS),
  }
}

// Convierte "AAAA" en el rango [inicio, fin) del año completo en hora de Guatemala
function rangoDelAnio(anio: string): { desde: number; hasta: number } {
  const numero = Number(anio)
  return {
    desde: Date.UTC(numero, 0, 1, DESFASE_GT_HORAS),
    hasta: Date.UTC(numero + 1, 0, 1, DESFASE_GT_HORAS),
  }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const ahora = Date.now()

  // El periodo puede ser un año completo (?anio=2026) o un mes (?mes=2026-10, por defecto el actual)
  const anioPedido = typeof req.query.anio === 'string' ? req.query.anio : ''
  const mesPedido = typeof req.query.mes === 'string' ? req.query.mes : ''
  const esAnio = /^\d{4}$/.test(anioPedido)
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(mesPedido) ? mesPedido : mesActual()
  const periodo = esAnio ? { tipo: 'anio', valor: anioPedido } : { tipo: 'mes', valor: mes }
  const rango = esAnio ? rangoDelAnio(anioPedido) : rangoDelMes(mes)

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

  const conteoMes = new Map<string, number>()
  const acumulado = new Map<string, { horas: number; clases: number }>()
  let clasesRealizadas = 0

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

    if (estadoVisible === 'realizada') {
      clasesRealizadas += 1
      const nombre = c.oferta?.categoria?.nombre ?? 'Sin categoría'
      const horas = (fin - inicio) / 3600000
      const previo = acumulado.get(nombre) ?? { horas: 0, clases: 0 }
      acumulado.set(nombre, { horas: previo.horas + horas, clases: previo.clases + 1 })
    }

    // Para la gráfica de estados solo cuentan las clases que inician en el periodo elegido
    if (inicio >= rango.desde && inicio < rango.hasta) {
      conteoMes.set(estadoVisible, (conteoMes.get(estadoVisible) ?? 0) + 1)
    }
  }

  const estados = ORDEN_ESTADOS.map(clave => ({ estado: clave, total: conteoMes.get(clave) ?? 0 }))

  const categorias = Array.from(acumulado, ([categoria, v]) => ({
    categoria,
    horas: Math.round(v.horas * 10) / 10,
    clases: v.clases,
  }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 8)

  // Mejores: los 5 con mayor promedio. Peores: los 5 con menor promedio
  // (la lista ya viene ordenada de mayor a menor, así que los peores son los últimos, invertidos)
  const mejores = tutoresCrudos.slice(0, 5)
  const peores = [...tutoresCrudos].reverse().slice(0, 5)

  const global = promedioCrudo[0]

  const aFila = (t: FilaTutor) => ({
    id: String(t._id),
    nombre: t.nombre,
    promedio: t.promedio,
    resenas: t.resenas,
  })

  res.json({
    periodo,
    resumen: {
      usuarios,
      tutoresAprobados,
      clasesRealizadas,
      calificacionPromedio: global ? Math.round(global.promedio * 100) / 100 : null,
      resenas: global ? global.total : 0,
    },
    estados,
    categorias,
    mejores: mejores.map(aFila),
    peores: peores.map(aFila),
  })
})

// Reseñas de un tutor (para abrirlas desde el ranking)
router.get('/tutores/:id/resenas', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const resenas = await Resena.find({ tutor: id }, 'calificacion comentario createdAt estudiante')
    .populate('estudiante', 'nombre')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  const lista = resenas as unknown as ResenaLeida[]

  res.json({
    resenas: lista.map(r => ({
      _id: String(r._id),
      calificacion: r.calificacion,
      comentario: r.comentario,
      createdAt: r.createdAt,
      estudiante: r.estudiante?.nombre ?? 'Usuario eliminado',
    })),
  })
})

export default router
