import { useEffect, useState } from 'react'
import { Container, Modal, Button, Badge, Form, Alert } from 'react-bootstrap'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { useAuth } from '../context/AuthContext'
import Ventana from '../components/Ventana'
import ResenaClase from '../components/ResenaClase'
import type { Tutoria, EstadoTutoria } from '../types'

type CambioEstado = 'aprobada' | 'rechazada' | 'cancelada'

const COLORES: Record<EstadoTutoria, string> = {
  pendiente: '#e0a800',
  aprobada: '#2e8b57',
  rechazada: '#6c757d',
  cancelada: '#c0392b',
  completada: '#2e86c1',
}

const ETIQUETAS: Record<EstadoTutoria, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  completada: 'Realizada',
}

const MODALIDADES: Record<string, string> = {
  virtual: 'Virtual',
  casa_tutor: 'En casa del tutor',
  casa_estudiante: 'En casa del estudiante',
}

const MENSAJES: Record<string, string> = {
  estado_no_permitido: 'La clase ya no está en un estado que permita esta acción.',
  clase_pasada: 'La clase ya comenzó, no se puede cambiar.',
  no_permitido: 'No tiene permiso para realizar esta acción.',
  tutoria_no_encontrada: 'La clase ya no existe.',
}

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  })
}

function esFutura(t: Tutoria): boolean {
  return new Date(t.inicio).getTime() > Date.now()
}

function estadoVisible(t: Tutoria): EstadoTutoria {
  return t.estado === 'aprobada' && new Date(t.fin).getTime() <= Date.now() ? 'completada' : t.estado
}

function Calendario() {
  const { estado: sesion, peticion } = useAuth()
  const rol = sesion.usuario?.rol

  const [tutorias, setTutorias] = useState<Tutoria[]>([])
  const [error, setError] = useState<string>('')
  const [mensaje, setMensaje] = useState<string>('')
  const [verInactivas, setVerInactivas] = useState<boolean>(false)
  const [seleccionada, setSeleccionada] = useState<Tutoria | null>(null)
  const [porCancelar, setPorCancelar] = useState<boolean>(false)

  const puedeResponder = rol === 'tutor' || rol === 'admin'

  async function cargar(): Promise<void> {
    const res = await peticion('/api/tutorias/mias')
    if (res.ok) {
      const datos = await res.json()
      setTutorias(datos.tutorias)
      setError('')
    } else {
      setError('No fue posible cargar las clases.')
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  function nombreOtro(t: Tutoria): string {
    if (rol === 'tutor') return t.estudiante.nombre
    if (rol === 'estudiante') return t.tutor.nombre
    return `${t.tutor.nombre} → ${t.estudiante.nombre}`
  }

  function titulo(t: Tutoria): string {
    return t.oferta ? t.oferta.titulo : 'Oferta eliminada'
  }

  async function cambiar(id: string, nuevo: CambioEstado): Promise<void> {
    setMensaje('')
    const res = await peticion(`/api/tutorias/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado: nuevo }),
    })

    if (res.ok) {
      setSeleccionada(null)
      setPorCancelar(false)
      await cargar()
      return
    }

    const datos = await res.json()
    setPorCancelar(false)
    setMensaje(MENSAJES[datos.error] || 'No fue posible actualizar la clase.')
  }

  function alHacerClic(arg: EventClickArg): void {
    const t = tutorias.find(x => x._id === arg.event.id)
    if (t) {
      setMensaje('')
      setSeleccionada(t)
    }
  }

  function cerrarDetalle(): void {
    setSeleccionada(null)
    setMensaje('')
  }

  const visibles = tutorias.filter(
    t => verInactivas || t.estado === 'pendiente' || t.estado === 'aprobada' || t.estado === 'completada'
  )

  const eventos: EventInput[] = visibles.map(t => ({
    id: t._id,
    title: `${titulo(t)} · ${nombreOtro(t)}`,
    start: t.inicio,
    end: t.fin,
    backgroundColor: COLORES[estadoVisible(t)],
    borderColor: COLORES[estadoVisible(t)],
  }))

  const pendientes = tutorias.filter(t => t.estado === 'pendiente' && esFutura(t))

  return (
    <Container className="py-4">
      <h2 className="titulo-seccion">
        <i className="bi bi-calendar3 me-2"></i>Calendario de clases
      </h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {mensaje && !seleccionada && <Alert variant="danger">{mensaje}</Alert>}

      {puedeResponder && (
        <div className="tarjeta mb-4">
          <h5 className="mb-3">Solicitudes pendientes de respuesta</h5>
          {pendientes.length === 0 ? (
            <p className="text-muted mb-0">No hay solicitudes pendientes.</p>
          ) : (
            <div className="list-group">
              {pendientes.map(t => (
                <div
                  key={t._id}
                  className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2"
                >
                  <div>
                    <strong>{titulo(t)}</strong> · {nombreOtro(t)}
                    <div className="small text-muted">
                      {formatoFecha(t.inicio)} · Q{t.total.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Button size="sm" variant="success" className="me-2" onClick={() => cambiar(t._id, 'aprobada')}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => cambiar(t._id, 'rechazada')}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="tarjeta">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div className="small">
            {(['pendiente', 'aprobada', 'completada', 'rechazada', 'cancelada'] as EstadoTutoria[]).map(e => (
              <span key={e} className="me-3">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: COLORES[e],
                    marginRight: 6,
                  }}
                ></span>
                {ETIQUETAS[e]}
              </span>
            ))}
          </div>
          <Form.Check
            type="switch"
            id="ver-inactivas"
            label="Mostrar rechazadas y canceladas"
            checked={verInactivas}
            onChange={e => setVerInactivas(e.target.checked)}
          />
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locale={esLocale}
          events={eventos}
          eventClick={alHacerClic}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
        />
      </div>

      <Modal show={seleccionada !== null && !porCancelar} onHide={cerrarDetalle} centered>
        {seleccionada && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{titulo(seleccionada)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {mensaje && <Alert variant="danger">{mensaje}</Alert>}
              <p className="mb-2">
                <Badge style={{ backgroundColor: COLORES[estadoVisible(seleccionada)] }}>
                  {ETIQUETAS[estadoVisible(seleccionada)]}
                </Badge>
              </p>
              <p className="mb-1"><strong>Tutor:</strong> {seleccionada.tutor.nombre}</p>
              <p className="mb-1"><strong>Estudiante:</strong> {seleccionada.estudiante.nombre}</p>
              <p className="mb-1"><strong>Inicio:</strong> {formatoFecha(seleccionada.inicio)}</p>
              <p className="mb-1"><strong>Fin:</strong> {formatoFecha(seleccionada.fin)}</p>
              {seleccionada.oferta && (
                <p className="mb-1">
                  <strong>Modalidad:</strong> {MODALIDADES[seleccionada.oferta.modalidad]}
                </p>
              )}
              {seleccionada.traslado > 0 && (
                <p className="mb-1">
                  <strong>Traslado:</strong> Q{seleccionada.traslado.toFixed(2)} ({seleccionada.distanciaKm} km)
                </p>
              )}
              <p className="mb-0"><strong>Total:</strong> Q{seleccionada.total.toFixed(2)}</p>
              <ResenaClase tutoria={seleccionada} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={cerrarDetalle}>Cerrar</Button>
              {puedeResponder && seleccionada.estado === 'pendiente' && esFutura(seleccionada) && (
                <>
                  <Button variant="success" onClick={() => cambiar(seleccionada._id, 'aprobada')}>
                    Aprobar
                  </Button>
                  <Button variant="outline-danger" onClick={() => cambiar(seleccionada._id, 'rechazada')}>
                    Rechazar
                  </Button>
                </>
              )}
              {(seleccionada.estado === 'pendiente' || seleccionada.estado === 'aprobada') &&
                esFutura(seleccionada) && (
                  <Button variant="danger" onClick={() => setPorCancelar(true)}>
                    Cancelar clase
                  </Button>
                )}
            </Modal.Footer>
          </>
        )}
      </Modal>

      <Ventana
        visible={porCancelar}
        titulo="Cancelar clase"
        mensaje="¿Desea cancelar esta clase? El horario quedará libre para otras solicitudes."
        textoConfirmar="Sí, cancelar"
        peligro
        onConfirmar={() => {
          if (seleccionada) cambiar(seleccionada._id, 'cancelada')
        }}
        onCerrar={() => setPorCancelar(false)}
      />
    </Container>
  )
}

export default Calendario