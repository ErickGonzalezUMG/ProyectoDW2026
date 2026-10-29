import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'

interface TutorRanking {
  id: string
  nombre: string
  promedio: number
  resenas: number
}

interface ResenaTutor {
  _id: string
  calificacion: number
  comentario: string
  createdAt: string
  estudiante: string
}

type TipoPeriodo = 'mes' | 'anio'

interface DatosAnaliticas {
  periodo: { tipo: TipoPeriodo; valor: string }
  resumen: {
    usuarios: number
    tutoresAprobados: number
    clasesRealizadas: number
    calificacionPromedio: number | null
    resenas: number
  }
  estados: { estado: string; total: number }[]
  categorias: { categoria: string; horas: number; clases: number }[]
  mejores: TutorRanking[]
  peores: TutorRanking[]
}

// Un color fijo por estado: el color sigue a la entidad, no a su posición
const ESTADOS: Record<string, { etiqueta: string; color: string }> = {
  realizada: { etiqueta: 'Realizadas', color: '#2a78d6' },
  proxima: { etiqueta: 'Próximas', color: '#1baf7a' },
  pendiente: { etiqueta: 'Pendientes', color: '#eda100' },
  rechazada: { etiqueta: 'Rechazadas', color: '#eb6834' },
  cancelada: { etiqueta: 'Canceladas', color: '#e34948' },
}

const COLOR_CATEGORIAS = '#2a78d6'
const COLOR_TEXTO = '#52514e'
const COLOR_REJILLA = '#e3e2de'

// Convierte "2026-10" en "octubre de 2026" y "2026" en "el año 2026"
function nombreDelPeriodo(tipo: TipoPeriodo, valor: string): string {
  if (tipo === 'anio') return `el año ${valor}`
  const [anio, numero] = valor.split('-').map(Number)
  return new Date(anio, numero - 1, 1).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
}

function TablaRanking({
  titulo,
  icono,
  filas,
  onVerResenas,
}: {
  titulo: string
  icono: string
  filas: TutorRanking[]
  onVerResenas: (tutor: TutorRanking) => void
}) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title as="h6">
          <i className={`bi ${icono} me-2`}></i>
          {titulo}
        </Card.Title>
        {filas.length === 0 ? (
          <p className="text-muted mb-0">Aún no hay suficientes reseñas.</p>
        ) : (
          <Table size="sm" className="mb-0 align-middle">
            <tbody>
              {filas.map(t => (
                <tr key={t.id}>
                  <td>{t.nombre}</td>
                  <td className="text-end">
                    <strong>{t.promedio.toFixed(2)}</strong> <i className="bi bi-star-fill text-warning"></i>
                  </td>
                  <td className="text-end text-muted">
                    {t.resenas} {t.resenas === 1 ? 'reseña' : 'reseñas'}
                  </td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-primary" onClick={() => onVerResenas(t)}>
                      Ver reseñas
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}

function Tarjeta({ valor, etiqueta, icono }: { valor: string; etiqueta: string; icono: string }) {
  return (
    <Card className="text-center h-100">
      <Card.Body>
        <i className={`bi ${icono} fs-4 text-primary`}></i>
        <div className="fs-3 fw-bold">{valor}</div>
        <small className="text-muted">{etiqueta}</small>
      </Card.Body>
    </Card>
  )
}

function Analiticas() {
  const { peticion } = useAuth()
  const [datos, setDatos] = useState<DatosAnaliticas | null>(null)
  const [tipo, setTipo] = useState<TipoPeriodo>('mes')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Ventana con las reseñas de un tutor
  const [tutorSel, setTutorSel] = useState<TutorRanking | null>(null)
  const [resenas, setResenas] = useState<ResenaTutor[] | null>(null)

  const cargar = useCallback(
    async (tipoElegido?: TipoPeriodo, valorElegido?: string) => {
      setCargando(true)
      setError('')
      try {
        const consulta = tipoElegido && valorElegido ? `?${tipoElegido}=${valorElegido}` : ''
        const res = await peticion(`/api/analiticas${consulta}`)
        if (!res.ok) {
          setError('No se pudieron cargar las analíticas.')
          return
        }
        const recibidos = (await res.json()) as DatosAnaliticas
        setDatos(recibidos)
        setTipo(recibidos.periodo.tipo)
        setAnio(recibidos.periodo.valor.slice(0, 4))
        if (recibidos.periodo.tipo === 'mes') setMes(recibidos.periodo.valor)
      } catch {
        setError('Error de conexión con el servidor.')
      } finally {
        setCargando(false)
      }
    },
    [peticion],
  )

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function verResenas(tutor: TutorRanking): Promise<void> {
    setTutorSel(tutor)
    setResenas(null)
    try {
      const res = await peticion(`/api/analiticas/tutores/${tutor.id}/resenas`)
      if (res.ok) {
        setResenas(((await res.json()) as { resenas: ResenaTutor[] }).resenas)
      } else {
        setResenas([])
      }
    } catch {
      setResenas([])
    }
  }

  if (cargando && !datos) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    )
  }

  if (error || !datos) {
    return <Alert variant="danger">{error || 'Sin datos.'}</Alert>
  }

  const { resumen } = datos
  const estados = datos.estados.map(e => ({
    ...e,
    etiqueta: ESTADOS[e.estado].etiqueta,
    color: ESTADOS[e.estado].color,
  }))
  const hayClases = estados.some(e => e.total > 0)
  const anioActual = new Date().getFullYear()
  const anios = Array.from(new Set([anioActual, anioActual - 1, anioActual - 2, anioActual - 3, Number(anio)])).sort(
    (a, b) => b - a,
  )

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <Button size="sm" variant="outline-primary" disabled={cargando} onClick={() => void cargar(tipo, tipo === 'mes' ? mes : anio)}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Actualizar
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Tarjeta valor={String(resumen.usuarios)} etiqueta="Usuarios registrados" icono="bi-people" />
        </Col>
        <Col xs={6} md={3}>
          <Tarjeta valor={String(resumen.tutoresAprobados)} etiqueta="Tutores aprobados" icono="bi-mortarboard" />
        </Col>
        <Col xs={6} md={3}>
          <Tarjeta valor={String(resumen.clasesRealizadas)} etiqueta="Clases realizadas" icono="bi-check2-circle" />
        </Col>
        <Col xs={6} md={3}>
          <Tarjeta
            valor={resumen.calificacionPromedio === null ? '—' : resumen.calificacionPromedio.toFixed(2)}
            etiqueta={`Calificación promedio (${resumen.resenas} reseñas)`}
            icono="bi-star"
          />
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <TablaRanking titulo="Mejores tutores" icono="bi-trophy" filas={datos.mejores} onVerResenas={verResenas} />
        </Col>
        <Col md={6}>
          <TablaRanking
            titulo="Tutores con menor calificación"
            icono="bi-graph-down-arrow"
            filas={datos.peores}
            onVerResenas={verResenas}
          />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6">Horas de clase por categoría</Card.Title>
              <small className="text-muted d-block mb-2">Solo clases realizadas</small>
              {datos.categorias.length === 0 ? (
                <p className="text-muted">Aún no hay clases realizadas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, datos.categorias.length * 44)}>
                  <BarChart data={datos.categorias} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke={COLOR_REJILLA} />
                    <XAxis type="number" tick={{ fill: COLOR_TEXTO, fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="categoria"
                      width={110}
                      tick={{ fill: COLOR_TEXTO, fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(valor) => [`${String(valor)} h`, 'Horas']}
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    />
                    <Bar dataKey="horas" fill={COLOR_CATEGORIAS} radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="horas" position="right" fill={COLOR_TEXTO} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                  <Card.Title as="h6" className="mb-0">
                    Clases por estado ({tipo === 'mes' ? 'mes' : 'año completo'})
                  </Card.Title>
                  <small className="text-muted">Impartidas frente a canceladas y rechazadas</small>
                </div>
                <div className="d-flex gap-2">
                  <Form.Select
                    size="sm"
                    style={{ width: 130 }}
                    value={tipo}
                    onChange={e => {
                      const nuevo = e.target.value as TipoPeriodo
                      setTipo(nuevo)
                      void cargar(nuevo, nuevo === 'mes' ? mes : anio)
                    }}
                    aria-label="Tipo de periodo"
                  >
                    <option value="mes">Un mes</option>
                    <option value="anio">Año completo</option>
                  </Form.Select>
                  {tipo === 'mes' ? (
                    <Form.Control
                      type="month"
                      size="sm"
                      style={{ width: 160 }}
                      value={mes}
                      onChange={e => {
                        setMes(e.target.value)
                        if (e.target.value) void cargar('mes', e.target.value)
                      }}
                      aria-label="Mes a consultar"
                    />
                  ) : (
                    <Form.Select
                      size="sm"
                      style={{ width: 100 }}
                      value={anio}
                      onChange={e => {
                        setAnio(e.target.value)
                        void cargar('anio', e.target.value)
                      }}
                      aria-label="Año a consultar"
                    >
                      {anios.map(a => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </div>
              </div>
              {!hayClases ? (
                <p className="text-muted">No hay clases en {nombreDelPeriodo(datos.periodo.tipo, datos.periodo.valor)}.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={estados} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke={COLOR_REJILLA} />
                    <XAxis type="number" tick={{ fill: COLOR_TEXTO, fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="etiqueta"
                      width={90}
                      tick={{ fill: COLOR_TEXTO, fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(valor) => [String(valor), 'Clases']}
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                      {estados.map(e => (
                        <Cell key={e.estado} fill={e.color} />
                      ))}
                      <LabelList dataKey="total" position="right" fill={COLOR_TEXTO} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={tutorSel !== null} onHide={() => setTutorSel(null)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Reseñas de {tutorSel?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resenas === null ? (
            <div className="text-center py-3">
              <Spinner animation="border" />
            </div>
          ) : resenas.length === 0 ? (
            <p className="text-muted mb-0">Este tutor aún no tiene reseñas.</p>
          ) : (
            resenas.map(r => (
              <div key={r._id} className="border-bottom pb-2 mb-2">
                <div className="d-flex justify-content-between">
                  <strong>{r.estudiante}</strong>
                  <small className="text-muted">
                    {new Date(r.createdAt).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' })}
                  </small>
                </div>
                <div aria-label={`${r.calificacion} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <i
                      key={n}
                      className={`bi ${n <= r.calificacion ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
                    ></i>
                  ))}
                </div>
                {r.comentario && <p className="mb-0 mt-1">{r.comentario}</p>}
              </div>
            ))
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default Analiticas
