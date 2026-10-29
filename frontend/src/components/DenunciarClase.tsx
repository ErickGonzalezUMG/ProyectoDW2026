import { useEffect, useState } from 'react'
import { Form, Button, Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import type { Tutoria } from '../types'

interface Props {
  tutoria: Tutoria
}

const MENSAJES: Record<string, string> = {
  ya_denunciada: 'Usted ya presentó una denuncia sobre esta clase.',
  tipo_invalido: 'Seleccione el tipo de denuncia.',
  motivo_invalido: 'Describa lo ocurrido con entre 10 y 500 caracteres.',
  no_permitido: 'Solo quienes participaron en la clase pueden denunciar.',
  clase_no_realizada: 'Solo se puede denunciar una clase que ya se realizó.',
}

function DenunciarClase({ tutoria }: Props) {
  const { estado: sesion, peticion } = useAuth()

  const [abierto, setAbierto] = useState<boolean>(false)
  const [tipo, setTipo] = useState<string>('')
  const [motivo, setMotivo] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [exito, setExito] = useState<string>('')
  const [enviando, setEnviando] = useState<boolean>(false)

  useEffect(() => {
    setAbierto(false)
    setTipo('')
    setMotivo('')
    setError('')
    setExito('')
  }, [tutoria._id])

  const yo = sesion.usuario?.id
  const rol = sesion.usuario?.rol
  const esTutor = yo === tutoria.tutor._id
  const esEstudiante = yo === tutoria.estudiante._id

  if ((rol !== 'estudiante' && rol !== 'tutor') || (!esTutor && !esEstudiante)) {
    return null
  }

  const realizada =
    (tutoria.estado === 'aprobada' || tutoria.estado === 'completada') &&
    new Date(tutoria.fin).getTime() <= Date.now()

  if (!realizada) {
    return (
      <p className="small text-muted border-top mt-3 pt-3 mb-0">
        Podrá presentar una denuncia cuando la clase se haya realizado.
      </p>
    )
  }

  const otro = esTutor ? tutoria.estudiante : tutoria.tutor

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const res = await peticion('/api/denuncias', {
      method: 'POST',
      body: JSON.stringify({ tutoria: tutoria._id, tipo, motivo }),
    })
    setEnviando(false)
    const datos = await res.json()

    if (res.ok) {
      setExito('Su denuncia fue enviada. El administrador la revisará.')
      setAbierto(false)
      setTipo('')
      setMotivo('')
      return
    }
    setError(MENSAJES[datos.error] || 'No fue posible enviar la denuncia.')
  }

  if (exito) {
    return <Alert variant="success" className="mt-3 mb-0">{exito}</Alert>
  }

  if (!abierto) {
    return (
      <div className="border-top mt-3 pt-3">
        <Button variant="outline-danger" size="sm" onClick={() => setAbierto(true)}>
          <i className="bi bi-flag me-1"></i>Denunciar a {otro.nombre}
        </Button>
      </div>
    )
  }

  return (
    <Form onSubmit={enviar} className="border-top mt-3 pt-3">
      <strong>Denunciar a {otro.nombre}</strong>
      {error && <Alert variant="danger" className="mt-2 mb-2">{error}</Alert>}
      <Form.Select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-2" required>
        <option value="">Seleccione el tipo de denuncia</option>
        <option value="inasistencia">Inasistencia</option>
        <option value="conducta_inapropiada">Conducta inapropiada</option>
        <option value="cobros_indebidos">Cobros indebidos</option>
      </Form.Select>
      <Form.Control
        as="textarea"
        rows={3}
        maxLength={500}
        placeholder="Describa lo ocurrido y aporte la evidencia que tenga"
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        className="my-2"
      />
      <Button type="submit" variant="danger" size="sm" className="me-2" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar denuncia'}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
    </Form>
  )
}

export default DenunciarClase