import { useEffect, useState } from 'react'
import { Modal, Form, Button, Alert, Row, Col } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import type { ResultadoBusqueda } from '../types'

interface Props {
  oferta: ResultadoBusqueda | null
  distanciaKm: number | null
  onCerrar: () => void
}

interface BloqueDisponibilidad {
  diaSemana: number
  horaInicio: number
  horaFin: number
}

type Tipo = 'unica' | 'sub4' | 'sub8'

const DIAS = [
  { n: 1, corto: 'Lun' },
  { n: 2, corto: 'Mar' },
  { n: 3, corto: 'Mié' },
  { n: 4, corto: 'Jue' },
  { n: 5, corto: 'Vie' },
  { n: 6, corto: 'Sáb' },
  { n: 0, corto: 'Dom' },
]

const NOMBRE_CORTO: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const HORAS: number[] = Array.from({ length: 16 }, (_, i) => i + 6)

const MENSAJES: Record<string, string> = {
  fuera_de_disponibilidad: 'El tutor no tiene disponibilidad en ese día u horario.',
  tutor_ocupado: 'El tutor ya tiene una clase en ese horario.',
  estudiante_ocupado: 'Usted ya tiene una clase en ese horario.',
  fecha_pasada: 'La fecha y la hora deben ser posteriores al momento actual.',
  fecha_invalida: 'Seleccione una fecha válida.',
  oferta_propia: 'No puede agendar su propia oferta.',
  oferta_no_disponible: 'Esta oferta ya no está disponible.',
  ubicacion_requerida: 'Su perfil debe tener una ubicación registrada.',
  sesiones_traslapadas: 'Las sesiones de la suscripción se traslapan entre sí.',
}

function hoy(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function formatoHora(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function VentanaAgendar({ oferta, distanciaKm, onCerrar }: Props) {
  const { peticion } = useAuth()

  const [tipo, setTipo] = useState<Tipo>('unica')
  const [fecha, setFecha] = useState<string>('')
  const [hora, setHora] = useState<string>('8')
  const [horas, setHoras] = useState<string>('1')
  const [dias, setDias] = useState<number[]>([])
  const [disponibilidad, setDisponibilidad] = useState<BloqueDisponibilidad[]>([])
  const [error, setError] = useState<string>('')
  const [exito, setExito] = useState<string>('')
  const [enviando, setEnviando] = useState<boolean>(false)

  useEffect(() => {
    setTipo('unica')
    setFecha('')
    setHora('8')
    setHoras('1')
    setDias([])
    setError('')
    setExito('')
    setDisponibilidad([])

    if (!oferta) return

    async function cargar(): Promise<void> {
      const res = await peticion(`/api/disponibilidad/tutor/${oferta?.tutor._id}`)
      if (res.ok) {
        const datos = await res.json()
        setDisponibilidad(datos.bloques)
      }
    }
    cargar()
  }, [oferta])

  function alternarDia(n: number): void {
    setDias(prev => (prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]))
  }

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!oferta) return
    setError('')

    if (tipo !== 'unica' && dias.length === 0) {
      setError('Seleccione al menos un día de la semana.')
      return
    }

    const ruta = tipo === 'unica' ? '/api/tutorias' : '/api/suscripciones'
    const cuerpo =
      tipo === 'unica'
        ? { oferta: oferta._id, fecha, horaInicio: Number(hora), horas: Number(horas) }
        : {
            oferta: oferta._id,
            semanas: tipo === 'sub4' ? 4 : 8,
            fechaInicio: fecha,
            sesiones: dias.map(d => ({ diaSemana: d, horaInicio: Number(hora), horas: Number(horas) })),
          }

    setEnviando(true)
    const res = await peticion(ruta, { method: 'POST', body: JSON.stringify(cuerpo) })
    setEnviando(false)
    const datos = await res.json()

    if (res.ok) {
      setExito(
        tipo === 'unica'
          ? 'Su solicitud fue enviada. El tutor la revisará y la confirmará.'
          : `Su suscripción fue creada con ${datos.tutorias} clases pendientes de confirmación por el tutor.`
      )
      return
    }

    const base = MENSAJES[datos.error] || 'No fue posible agendar la clase. Revise los datos.'
    setError(datos.fecha ? `${base} (fecha: ${datos.fecha})` : base)
  }

  const sesiones = tipo === 'unica' ? 1 : dias.length * (tipo === 'sub4' ? 4 : 8)
  const traslado =
    oferta && oferta.modalidad === 'casa_estudiante' && distanciaKm !== null
      ? Math.round(distanciaKm * oferta.tarifaKm * 100) / 100
      : 0
  const porSesion = oferta ? oferta.tarifaHora * Number(horas) + traslado : 0
  const total = porSesion * sesiones

  return (
    <Modal show={oferta !== null} onHide={onCerrar} centered>
      {oferta && (
        <Form onSubmit={enviar}>
          <Modal.Header closeButton>
            <Modal.Title>Agendar con {oferta.tutor.nombre}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              <strong>{oferta.titulo}</strong> · {oferta.categoria}
            </p>

            <div className="small text-muted mb-3">
              <i className="bi bi-calendar-week me-1"></i>
              Disponibilidad del tutor:{' '}
              {disponibilidad.length === 0
                ? 'aún no ha definido horarios.'
                : disponibilidad
                    .map(b => `${NOMBRE_CORTO[b.diaSemana]} ${formatoHora(b.horaInicio)}–${formatoHora(b.horaFin)}`)
                    .join(', ')}
            </div>

            {exito ? (
              <Alert variant="success" className="mb-0">{exito}</Alert>
            ) : (
              <>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form.Group className="mb-3">
                  <Form.Label>Tipo de contratación</Form.Label>
                  <Form.Select value={tipo} onChange={e => setTipo(e.target.value as Tipo)}>
                    <option value="unica">Clase única</option>
                    <option value="sub4">Suscripción de 4 semanas</option>
                    <option value="sub8">Suscripción de 8 semanas</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{tipo === 'unica' ? 'Fecha' : 'Fecha de inicio'}</Form.Label>
                  <Form.Control
                    type="date"
                    min={hoy()}
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    required
                  />
                </Form.Group>

                {tipo !== 'unica' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Días fijos de la semana</Form.Label>
                    <div>
                      {DIAS.map(d => (
                        <Form.Check
                          inline
                          key={d.n}
                          type="checkbox"
                          label={d.corto}
                          checked={dias.includes(d.n)}
                          onChange={() => alternarDia(d.n)}
                        />
                      ))}
                    </div>
                  </Form.Group>
                )}

                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Hora de inicio</Form.Label>
                      <Form.Select value={hora} onChange={e => setHora(e.target.value)}>
                        {HORAS.map(h => (
                          <option key={h} value={h}>{formatoHora(h)}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Duración</Form.Label>
                      <Form.Select value={horas} onChange={e => setHoras(e.target.value)}>
                        <option value="1">1 hora</option>
                        <option value="2">2 horas</option>
                        <option value="3">3 horas</option>
                        <option value="4">4 horas</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="border rounded p-2 small">
                  <div className="d-flex justify-content-between">
                    <span>Tarifa ({horas} h × Q{oferta.tarifaHora.toFixed(2)})</span>
                    <span>Q{(oferta.tarifaHora * Number(horas)).toFixed(2)}</span>
                  </div>
                  {oferta.modalidad === 'casa_estudiante' && (
                    <div className="d-flex justify-content-between">
                      <span>Traslado por sesión (estimado)</span>
                      <span>Q{traslado.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>Sesiones</span>
                    <span>{sesiones}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1">
                    <span>Total estimado</span>
                    <span>Q{total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            {exito ? (
              <Button onClick={onCerrar}>Cerrar</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Solicitar'}
                </Button>
              </>
            )}
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  )
}

export default VentanaAgendar