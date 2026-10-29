import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Container, Alert, Form, Button } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import type { ApelacionInfo, SuspensionInfo, Usuario } from '../types'

const MENSAJES: Record<string, string> = {
  apelacion_pendiente: 'Ya tiene una apelación en revisión.',
  mensaje_invalido: 'Escriba un mensaje de entre 10 y 1000 caracteres.',
  no_suspendido: 'Su cuenta ya no está suspendida. Pulse "Comprobar estado de mi cuenta".',
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    dateStyle: 'long',
    timeZone: 'America/Guatemala',
  })
}

function Suspendido() {
  const { estado, dispatch, peticion } = useAuth()

  const [suspension, setSuspension] = useState<SuspensionInfo | null>(null)
  const [apelacion, setApelacion] = useState<ApelacionInfo | null>(null)
  const [mensaje, setMensaje] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [aviso, setAviso] = useState<string>('')
  const [enviando, setEnviando] = useState<boolean>(false)

  const suspendido = estado.isAuthenticated && estado.usuario?.estado === 'suspendido'

  async function cargar(): Promise<void> {
    const res = await peticion('/api/apelaciones/estado')
    if (res.ok) {
      const datos = await res.json()
      setSuspension(datos.suspension)
      setApelacion(datos.apelacion)
    }
  }

  useEffect(() => {
    if (suspendido) cargar()
  }, [suspendido])

  async function apelar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setAviso('')
    setEnviando(true)
    const res = await peticion('/api/apelaciones', {
      method: 'POST',
      body: JSON.stringify({ mensaje }),
    })
    setEnviando(false)
    const datos = await res.json()

    if (res.ok) {
      setMensaje('')
      await cargar()
      return
    }
    setError(MENSAJES[datos.error] || 'No fue posible enviar la apelación.')
  }

  async function comprobar(): Promise<void> {
    setAviso('')
    const res = await peticion('/api/auth/yo')
    if (!res.ok) {
      setAviso('No fue posible comprobar el estado de su cuenta.')
      return
    }
    const datos = await res.json()
    if (datos.usuario.estado === 'suspendido') {
      setAviso('Su cuenta continúa suspendida.')
      return
    }
    dispatch({ type: 'ACTUALIZAR_USUARIO', usuario: datos.usuario as Usuario })
  }

  if (!estado.isAuthenticated || !estado.usuario) {
    return <Navigate to="/login" replace />
  }

  if (!suspendido) {
    return <Navigate to="/" replace />
  }

  const pendiente = apelacion !== null && apelacion.estado === 'pendiente'
  const rechazada = apelacion !== null && apelacion.estado === 'rechazada'

  return (
    <Container className="my-5" style={{ maxWidth: '640px' }}>
      <div className="tarjeta">
        <div className="text-center mb-3">
          <i className="bi bi-slash-circle text-danger" style={{ fontSize: '3rem' }}></i>
          <h2 className="titulo-seccion mt-2">Su cuenta está suspendida</h2>
        </div>

        <p className="mb-1">
          <strong>Motivo:</strong> {suspension ? suspension.motivo : 'No se registró un motivo.'}
        </p>
        {suspension && (
          <p className="mb-3">
            <strong>Fecha de suspensión:</strong> {fecha(suspension.createdAt)}
          </p>
        )}

        <p>
          Mientras la suspensión esté activa no puede usar la plataforma. Puede revisar las{' '}
          <Link to="/politicas">políticas de uso</Link> y enviar una apelación para que el
          administrador revise su caso.
        </p>

        {pendiente && apelacion && (
          <Alert variant="info">
            <strong>Su apelación fue enviada el {fecha(apelacion.createdAt)} y está en revisión.</strong>
            <div className="mt-1">{apelacion.mensaje}</div>
          </Alert>
        )}

        {rechazada && (
          <Alert variant="warning">
            Su apelación anterior fue rechazada. Puede enviar una nueva con más información.
          </Alert>
        )}

        {!pendiente && (
          <Form onSubmit={apelar} className="mb-3">
            <Form.Label>Apelación</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              maxLength={1000}
              placeholder="Explique por qué considera que la suspensión debe revisarse"
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
            />
            {error && <Alert variant="danger" className="mt-2 mb-0">{error}</Alert>}
            <Button type="submit" className="mt-3" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar apelación'}
            </Button>
          </Form>
        )}

        {aviso && <Alert variant="secondary">{aviso}</Alert>}

        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-primary" onClick={comprobar}>
            <i className="bi bi-arrow-repeat me-1"></i>Comprobar estado de mi cuenta
          </Button>
          <Button variant="outline-secondary" onClick={() => dispatch({ type: 'LOGOUT' })}>
            <i className="bi bi-box-arrow-right me-1"></i>Cerrar sesión
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default Suspendido