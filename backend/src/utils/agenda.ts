import { Types } from 'mongoose'
import Oferta from '../models/Oferta'
import Usuario from '../models/Usuario'
import Disponibilidad from '../models/Disponibilidad'
import Tutoria from '../models/Tutoria'
import type { EstadoTutoria } from '../models/Tutoria'
import { distanciaPorCalles, redondear } from './geo'

type DocOferta = InstanceType<typeof Oferta>
type DocUsuario = InstanceType<typeof Usuario>

export interface ErrorAgenda {
  status: number
  error: string
}

export interface Contexto {
  oferta: DocOferta
  tutor: DocUsuario
  estudiante: DocUsuario
}

export interface Horario {
  inicio: Date
  fin: Date
  diaSemana: number
  horaInicio: number
  horas: number
}

export interface Precio {
  distanciaKm: number
  traslado: number
  total: number
}

const ESTADOS_QUE_OCUPAN: EstadoTutoria[] = ['pendiente', 'aprobada']

export function esError(valor: unknown): valor is ErrorAgenda {
  const v = valor as ErrorAgenda
  return typeof valor === 'object' && valor !== null && v.error !== undefined && v.status !== undefined
}

export async function cargarContexto(
  ofertaId: string,
  estudianteId: string
): Promise<Contexto | ErrorAgenda> {
  if (!Types.ObjectId.isValid(ofertaId)) {
    return { status: 400, error: 'oferta_invalida' }
  }

  const oferta = await Oferta.findById(ofertaId)
  if (!oferta || !oferta.activa) {
    return { status: 404, error: 'oferta_no_disponible' }
  }

  const tutor = await Usuario.findById(oferta.tutor)
  if (!tutor || tutor.estado !== 'activo' || (tutor.rol === 'tutor' && !tutor.aprobado)) {
    return { status: 404, error: 'oferta_no_disponible' }
  }

  const estudiante = await Usuario.findById(estudianteId)
  if (!estudiante) {
    return { status: 401, error: 'token_invalido' }
  }

  if (String(tutor._id) === String(estudiante._id)) {
    return { status: 400, error: 'oferta_propia' }
  }

  return { oferta, tutor, estudiante }
}

export function armarHorario(
  fecha: string,
  horaInicio: unknown,
  horas: unknown
): Horario | ErrorAgenda {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!partes) {
    return { status: 400, error: 'fecha_invalida' }
  }

  if (typeof horaInicio !== 'number' || !Number.isInteger(horaInicio) || horaInicio < 0 || horaInicio > 23) {
    return { status: 400, error: 'hora_invalida' }
  }

  if (
    typeof horas !== 'number' ||
    !Number.isInteger(horas) ||
    horas < 1 ||
    horas > 4 ||
    horaInicio + horas > 24
  ) {
    return { status: 400, error: 'duracion_invalida' }
  }

  const diaSemana = new Date(
    Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
  ).getUTCDay()

  const inicio = new Date(`${fecha}T${String(horaInicio).padStart(2, '0')}:00:00-06:00`)
  if (isNaN(inicio.getTime())) {
    return { status: 400, error: 'fecha_invalida' }
  }
  if (inicio.getTime() <= Date.now()) {
    return { status: 400, error: 'fecha_pasada' }
  }

  const fin = new Date(inicio.getTime() + horas * 60 * 60 * 1000)

  return { inicio, fin, diaSemana, horaInicio, horas }
}

export async function validarHorario(
  tutorId: Types.ObjectId,
  estudianteId: Types.ObjectId,
  h: Horario
): Promise<ErrorAgenda | null> {
  const cubierto = await Disponibilidad.exists({
    tutor: tutorId,
    diaSemana: h.diaSemana,
    horaInicio: { $lte: h.horaInicio },
    horaFin: { $gte: h.horaInicio + h.horas },
  })
  if (!cubierto) {
    return { status: 409, error: 'fuera_de_disponibilidad' }
  }

  const choque = {
    estado: { $in: ESTADOS_QUE_OCUPAN },
    inicio: { $lt: h.fin },
    fin: { $gt: h.inicio },
  }

  if (await Tutoria.exists({ ...choque, tutor: tutorId })) {
    return { status: 409, error: 'tutor_ocupado' }
  }

  if (await Tutoria.exists({ ...choque, estudiante: estudianteId })) {
    return { status: 409, error: 'estudiante_ocupado' }
  }

  return null
}

export async function distanciaDeTraslado(ctx: Contexto): Promise<number | ErrorAgenda> {
  if (ctx.oferta.modalidad !== 'casa_estudiante') {
    return 0
  }

  const { tutor, estudiante } = ctx
  if (
    tutor.latitud === null ||
    tutor.longitud === null ||
    estudiante.latitud === null ||
    estudiante.longitud === null
  ) {
    return { status: 400, error: 'ubicacion_requerida' }
  }

  return distanciaPorCalles(tutor.latitud, tutor.longitud, estudiante.latitud, estudiante.longitud)
}

export function precioSesion(oferta: DocOferta, distanciaKm: number, horas: number): Precio {
  const traslado =
    oferta.modalidad === 'casa_estudiante' ? redondear(distanciaKm * oferta.tarifaKm) : 0
  return {
    distanciaKm,
    traslado,
    total: redondear(oferta.tarifaHora * horas + traslado),
  }
}