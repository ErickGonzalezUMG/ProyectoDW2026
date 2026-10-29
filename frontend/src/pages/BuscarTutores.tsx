import { useEffect, useState } from 'react'
import { Container, Row, Col, Form, Button, Card, Badge, Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import MapaBusqueda from '../components/MapaBusqueda'
import { obtenerRuta } from '../utils/rutas'
import VentanaAgendar from '../components/VentanaAgendar'
import Estrellas from '../components/Estrellas'
import { NOMBRE_SISTEMA } from '../config'
import type { Categoria, Coordenada, Modalidad, ResultadoBusqueda } from '../types'

const etiquetas: Record<Modalidad, string> = {
  virtual: 'Virtual',
  casa_tutor: 'En casa del tutor',
  casa_estudiante: 'En casa del estudiante',
}

function BuscarTutores() {
  const { peticion } = useAuth()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [principal, setPrincipal] = useState<string>('')
  const [subcategoria, setSubcategoria] = useState<string>('')
  const [modalidad, setModalidad] = useState<string>('')
  const [radio, setRadio] = useState<string>('10')
  const [precioMin, setPrecioMin] = useState<string>('')
  const [precioMax, setPrecioMax] = useState<string>('')
  const [calificacionMin, setCalificacionMin] = useState<string>('')
  const [resenasMin, setResenasMin] = useState<string>('')

  const [origen, setOrigen] = useState<Coordenada | null>(null)
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [cargando, setCargando] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [ruta, setRuta] = useState<[number, number][] | null>(null)
  const [distanciaReal, setDistanciaReal] = useState<number | null>(null)
  const [agendando, setAgendando] = useState<ResultadoBusqueda | null>(null)

  const principales = categorias.filter(c => c.padre === null)
  const hijas = principal ? categorias.filter(h => h.padre === principal) : []

  function distanciaDe(r: ResultadoBusqueda): number | null {
    return r._id === seleccionado && distanciaReal !== null ? distanciaReal : r.distanciaKm
  }

  function trasladoDe(r: ResultadoBusqueda): number {
    const d = distanciaDe(r)
    if (r.modalidad !== 'casa_estudiante' || d === null) return 0
    return Math.round(d * r.tarifaKm * 100) / 100
  }

  function compartirWhatsApp(r: ResultadoBusqueda): void {
    const calificacion =
      r.tutor.resenas > 0 ? ` Calificación: ${r.tutor.calificacion.toFixed(1)} de 5.` : ''
    const mensaje =
      `Te recomiendo a ${r.tutor.nombre} en ${NOMBRE_SISTEMA}: "${r.titulo}" ` +
      `(${r.categoria}), Q${r.tarifaHora.toFixed(2)} por hora.${calificacion} ` +
      `${window.location.origin}`
    const enlace = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(enlace, '_blank', 'noopener,noreferrer')
  }

  async function buscar(centro: Coordenada | null): Promise<void> {
    setError('')
    setCargando(true)

    const params = new URLSearchParams()
    if (centro) {
      params.set('lat', String(centro.lat))
      params.set('lng', String(centro.lng))
    }
    params.set('radio', radio || '10')
    if (precioMin) params.set('precioMin', precioMin)
    if (precioMax) params.set('precioMax', precioMax)
    if (calificacionMin) params.set('calificacionMin', calificacionMin)
    if (resenasMin) params.set('resenasMin', resenasMin)
    if (modalidad) params.set('modalidad', modalidad)
    const categoria = subcategoria || principal
    if (categoria) params.set('categoria', categoria)

    const res = await peticion(`/api/buscar?${params.toString()}`)
    setCargando(false)

    if (!res.ok) {
      setError('No fue posible realizar la búsqueda. Verifique que su perfil tenga ubicación.')
      return
    }

    const datos = await res.json()
    setOrigen(datos.origen)
    setResultados(datos.resultados)
    setSeleccionado(null)
  }

  useEffect(() => {
    async function inicial(): Promise<void> {
      const res = await peticion('/api/categorias')
      if (res.ok) {
        const datos = await res.json()
        setCategorias(datos.categorias)
      }
      buscar(null)
    }
    inicial()
  }, [])

  useEffect(() => {
    const oferta = resultados.find(r => r._id === seleccionado)
    setRuta(null)
    setDistanciaReal(null)

    if (!oferta || !origen || oferta.modalidad === 'virtual') return
    if (oferta.tutor.latitud === null || oferta.tutor.longitud === null) return

    let vigente = true
    obtenerRuta(origen, { lat: oferta.tutor.latitud, lng: oferta.tutor.longitud }).then(r => {
      if (vigente && r) {
        setRuta(r.puntos)
        setDistanciaReal(r.distanciaKm)
      }
    })

    return () => {
      vigente = false
    }
  }, [seleccionado])

  function moverOrigen(c: Coordenada): void {
    setOrigen(c)
    buscar(c)
  }

  return (
    <Container className="my-4">
      <h2 className="titulo-seccion">
        <i className="bi bi-search"></i>Buscar tutores
      </h2>

      <div className="tarjeta mb-4">
        <Form
          onSubmit={e => {
            e.preventDefault()
            buscar(origen)
          }}
        >
          <Row className="g-3">
            <Col md={3}>
              <Form.Label>Categoría</Form.Label>
              <Form.Select
                value={principal}
                onChange={e => {
                  setPrincipal(e.target.value)
                  setSubcategoria('')
                }}
              >
                <option value="">Todas</option>
                {principales.map(p => (
                  <option key={p._id} value={p._id}>{p.nombre}</option>
                ))}
              </Form.Select>
            </Col>

            {hijas.length > 0 && (
              <Col md={3}>
                <Form.Label>Subcategoría</Form.Label>
                <Form.Select value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
                  <option value="">Todas</option>
                  {hijas.map(h => (
                    <option key={h._id} value={h._id}>{h.nombre}</option>
                  ))}
                </Form.Select>
              </Col>
            )}

            <Col md={3}>
              <Form.Label>Modalidad</Form.Label>
              <Form.Select value={modalidad} onChange={e => setModalidad(e.target.value)}>
                <option value="">Todas</option>
                <option value="virtual">Virtual</option>
                <option value="casa_tutor">En casa del tutor</option>
                <option value="casa_estudiante">En casa del estudiante</option>
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Radio (km)</Form.Label>
              <Form.Control type="number" min="1" value={radio} onChange={e => setRadio(e.target.value)} />
            </Col>

            <Col md={2}>
              <Form.Label>Precio mín. (Q)</Form.Label>
              <Form.Control type="number" min="0" value={precioMin} onChange={e => setPrecioMin(e.target.value)} />
            </Col>

            <Col md={2}>
              <Form.Label>Precio máx. (Q)</Form.Label>
              <Form.Control type="number" min="0" value={precioMax} onChange={e => setPrecioMax(e.target.value)} />
            </Col>

            <Col md={2}>
              <Form.Label>Calificación</Form.Label>
              <Form.Select value={calificacionMin} onChange={e => setCalificacionMin(e.target.value)}>
                <option value="">Cualquiera</option>
                <option value="3">3 o más</option>
                <option value="4">4 o más</option>
                <option value="4.5">4.5 o más</option>
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Reseñas</Form.Label>
              <Form.Select value={resenasMin} onChange={e => setResenasMin(e.target.value)}>
                <option value="">Cualquiera</option>
                <option value="1">1 o más</option>
                <option value="3">3 o más</option>
                <option value="5">5 o más</option>
                <option value="10">10 o más</option>
              </Form.Select>
            </Col>

            <Col md="auto" className="d-flex align-items-end">
              <Button type="submit" disabled={cargando}>
                <i className="bi bi-search me-1"></i>{cargando ? 'Buscando...' : 'Buscar'}
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={5} className="mb-3">
          <p className="text-muted">
            {resultados.length} {resultados.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}.
            Haga clic en el mapa para buscar desde otro punto.
          </p>

          {resultados.length === 0 && !cargando && (
            <div className="tarjeta text-center text-muted">
              No hay ofertas con estos filtros. Pruebe ampliar el radio o quitar filtros.
            </div>
          )}

          {resultados.map(r => (
            <Card
              key={r._id}
              className={`mb-3 ${seleccionado === r._id ? 'border border-primary' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSeleccionado(r._id)}
            >
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  {r.tutor.foto && (
                    <img
                      src={r.tutor.foto}
                      alt=""
                      width={44}
                      height={44}
                      className="rounded-circle me-2"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex-grow-1">
                    <strong>{r.tutor.nombre}</strong>
                    <div className="text-muted small">{r.categoria}</div>
                    <Estrellas valor={r.tutor.calificacion} cantidad={r.tutor.resenas} />
                  </div>
                  <Badge bg="primary">{etiquetas[r.modalidad]}</Badge>
                </div>

                <div className="d-flex justify-content-between align-items-start">
                  <Card.Title className="h6">{r.titulo}</Card.Title>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-success"
                      title="Compartir por WhatsApp"
                      onClick={e => {
                        e.stopPropagation()
                        compartirWhatsApp(r)
                      }}
                    >
                      <i className="bi bi-whatsapp"></i>
                    </Button>
                    <Button
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        setAgendando(r)
                      }}
                    >
                      Agendar
                    </Button>
                  </div>
                </div>
                {r.descripcion && <Card.Text className="small">{r.descripcion}</Card.Text>}

                {distanciaDe(r) !== null && (
                  <div className="small text-muted mb-2">
                    <i className="bi bi-geo-alt me-1"></i>A {distanciaDe(r)} km
                    {r._id === seleccionado && distanciaReal !== null
                      ? ' (distancia por calles)'
                      : ' (en línea recta)'}
                  </div>
                )}

                <div className="d-flex justify-content-between small">
                  <span>Tarifa por hora</span>
                  <span>Q{r.tarifaHora.toFixed(2)}</span>
                </div>
                {r.modalidad === 'casa_estudiante' && (
                  <div className="d-flex justify-content-between small">
                    <span>Traslado ({distanciaDe(r)} km × Q{r.tarifaKm})</span>
                    <span>Q{trasladoDe(r).toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1">
                  <span>Total por hora</span>
                  <span>Q{(r.tarifaHora + trasladoDe(r)).toFixed(2)}</span>
                </div>
              </Card.Body>
            </Card>
          ))}
        </Col>

        <Col lg={7}>
          {origen && (
            <MapaBusqueda
              origen={origen}
              radio={Number(radio) || 10}
              resultados={resultados}
              seleccionado={seleccionado}
              onOrigen={moverOrigen}
              onSeleccionar={setSeleccionado}
              ruta={ruta}
            />
          )}
        </Col>
      </Row>

      <VentanaAgendar
        oferta={agendando}
        distanciaKm={agendando ? distanciaDe(agendando) : null}
        onCerrar={() => setAgendando(null)}
      />
    </Container>
  )
}

export default BuscarTutores