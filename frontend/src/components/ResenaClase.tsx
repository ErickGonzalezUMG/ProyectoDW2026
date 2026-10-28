import { useEffect, useState } from 'react'
import { Form, Button, Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import Estrellas from './Estrellas'
import type { Resena, Tutoria } from '../types'

interface Props {
  tutoria: Tutoria
}

const MENSAJES: Record<string, string> = {
  clase_no_realizada: 'Solo puede calificar una clase aprobada que ya terminó.',
  ya_calificada: 'Esta clase ya fue calificada.',
  no_permitido: 'Solo el estudiante de la clase puede calificarla.',
  calificacion_invalida: 'Seleccione una calificación de 1 a 5.',
}

function ResenaClase({ tutoria }: Props) {
  const { estado: sesion, peticion } = useAuth()

  const [resena, setResena] = useState<Resena | null>(null)
  const [calificacion, setCalificacion] = useState<number>(5)
  const [comentario, setComentario] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [enviando, setEnviando] = useState<boolean>(false)

  useEffect(() => {
    setResena(null)
    setCalificacion(5)
    setComentario('')
    setError('')

    async function cargar(): Promise<void> {
      const res = await peticion('/api/resenas/mias')
      if (res.ok) {
        const datos = await res.json()
        const encontrada = (datos.resenas as Resena[]).find(r => r.tutoria === tutoria._id)
        setResena(encontrada ?? null)
      }
    }
    cargar()
  }, [tutoria._id])

  const terminada =
    (tutoria.estado === 'aprobada' || tutoria.estado === 'completada') &&
    new Date(tutoria.fin).getTime() <= Date.now()

  const esElEstudiante = sesion.usuario?.id === tutoria.estudiante._id

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const res = await peticion('/api/resenas', {
      method: 'POST',
      body: JSON.stringify({ tutoria: tutoria._id, calificacion, comentario }),
    })
    setEnviando(false)
    const datos = await res.json()

    if (res.ok) {
      setResena(datos.resena)
      return
    }
    setError(MENSAJES[datos.error] || 'No fue posible guardar la reseña.')
  }

  if (resena) {
    return (
      <div className="border-top mt-3 pt-3">
        <strong>Reseña</strong>
        <Estrellas valor={resena.calificacion} />
        {resena.comentario && <p className="small mb-0 mt-1">{resena.comentario}</p>}
      </div>
    )
  }

  if (!terminada) return null

  if (!esElEstudiante) {
    return <p className="small text-muted border-top mt-3 pt-3 mb-0">Esta clase aún no tiene reseña.</p>
  }

  return (
    <Form onSubmit={enviar} className="border-top mt-3 pt-3">
      <strong>Califique esta clase</strong>
      {error && <Alert variant="danger" className="mt-2 mb-2">{error}</Alert>}

      <div className="my-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className="btn btn-link p-0 me-1 text-warning fs-4"
            onClick={() => setCalificacion(n)}
            aria-label={`${n} estrellas`}
          >
            <i className={`bi ${n <= calificacion ? 'bi-star-fill' : 'bi-star'}`}></i>
          </button>
        ))}
      </div>

      <Form.Control
        as="textarea"
        rows={2}
        maxLength={500}
        placeholder="Comentario (opcional)"
        value={comentario}
        onChange={e => setComentario(e.target.value)}
        className="mb-2"
      />
      <Button type="submit" size="sm" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar reseña'}
      </Button>
    </Form>
  )
}

export default ResenaClase