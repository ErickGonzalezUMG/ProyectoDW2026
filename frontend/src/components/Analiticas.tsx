import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'

interface TutorRanking {
  nombre: string
  promedio: number
  resenas: number
}

interface DatosAnaliticas {
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

function TablaRanking({ titulo, icono, filas }: { titulo: string; icono: string; filas: TutorRanking[] }) {
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
              {filas.map((t, i) => (
                <tr key={`${t.nombre}-${i}`}>
                  <td>{t.nombre}</td>
                  <td className="text-end">
                    <strong>{t.promedio.toFixed(2)}</strong> <i className="bi bi-star-fill text-warning"></i>
                  </td>
                  <td className="text-end text-muted">
                    {t.resenas} {t.resenas === 1 ? 'reseña' : 'reseñas'}
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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await peticion('/api/analiticas')
      if (!res.ok) {
        setError('No se pudieron cargar las analíticas.')
        return
      }
      setDatos((await res.json()) as DatosAnaliticas)
    } catch {
      setError('Error de conexión con el servidor.')
    } finally {
      setCargando(false)
    }
  }, [peticion])

  useEffect(() => {
    void cargar()
  }, [cargar])

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

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <Button size="sm" variant="outline-primary" disabled={cargando} onClick={() => void cargar()}>
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
          <TablaRanking titulo="Mejores tutores" icono="bi-trophy" filas={datos.mejores} />
        </Col>
        <Col md={6}>
          <TablaRanking titulo="Tutores con menor calificación" icono="bi-graph-down-arrow" filas={datos.peores} />
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
              <Card.Title as="h6">Clases por estado</Card.Title>
              <small className="text-muted d-block mb-2">Realizadas frente a canceladas y rechazadas</small>
              {!hayClases ? (
                <p className="text-muted">Aún no hay clases registradas.</p>
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
    </div>
  )
}

export default Analiticas