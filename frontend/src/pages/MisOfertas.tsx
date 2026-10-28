import { useEffect, useState } from 'react'
import { Container, Button, Card, Badge, Modal, Form, Alert, Row, Col } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import Ventana from '../components/Ventana'
import type { Categoria, Modalidad, Oferta } from '../types'

const etiquetas: Record<Modalidad, string> = {
  virtual: 'Virtual',
  casa_tutor: 'En casa del tutor',
  casa_estudiante: 'En casa del estudiante',
}

function MisOfertas() {
  const { estado, peticion } = useAuth()
  const usuario = estado.usuario

  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mostrarForm, setMostrarForm] = useState<boolean>(false)
  const [editando, setEditando] = useState<Oferta | null>(null)
  const [aEliminar, setAEliminar] = useState<Oferta | null>(null)
  const [error, setError] = useState<string>('')

  const [titulo, setTitulo] = useState<string>('')
  const [principal, setPrincipal] = useState<string>('')
  const [subcategoria, setSubcategoria] = useState<string>('')
  const [modalidad, setModalidad] = useState<Modalidad>('virtual')
  const [tarifaHora, setTarifaHora] = useState<string>('')
  const [tarifaKm, setTarifaKm] = useState<string>('0')
  const [descripcion, setDescripcion] = useState<string>('')

  const principales = categorias.filter(c => c.padre === null)
  const hijas = principal ? categorias.filter(h => h.padre === principal) : []
  const categoriaFinal = hijas.length > 0 ? subcategoria : principal

  function rutaCategoria(id: string, nombre: string): string {
  const c = categorias.find(x => x._id === id)
  const p = c && c.padre ? categorias.find(x => x._id === c.padre) : undefined
  return p ? `${p.nombre} › ${nombre}` : nombre
  }

  async function cargar(): Promise<void> {
    const resOfertas = await peticion('/api/ofertas/mias')
    if (resOfertas.ok) {
      const datos = await resOfertas.json()
      setOfertas(datos.ofertas)
    }
    const resCat = await peticion('/api/categorias')
    if (resCat.ok) {
      const datos = await resCat.json()
      setCategorias(datos.categorias)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirNueva(): void {
    setEditando(null)
    setTitulo('')
    setPrincipal('')
    setSubcategoria('')
    setModalidad('virtual')
    setTarifaHora('')
    setTarifaKm('0')
    setDescripcion('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(o: Oferta): void {
    const guardada = categorias.find(c => c._id === o.categoria._id)
    setEditando(o)
    setTitulo(o.titulo)
    if (guardada && guardada.padre) {
      setPrincipal(guardada.padre)
      setSubcategoria(guardada._id)
    } else {
      setPrincipal(o.categoria._id)
      setSubcategoria('')
    }
    setModalidad(o.modalidad)
    setTarifaHora(String(o.tarifaHora))
    setTarifaKm(String(o.tarifaKm))
    setDescripcion(o.descripcion)
    setError('')
    setMostrarForm(true)
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const ruta = editando ? `/api/ofertas/${editando._id}` : '/api/ofertas'
    const res = await peticion(ruta, {
      method: editando ? 'PUT' : 'POST',
      body: JSON.stringify({
        titulo,
        categoria: categoriaFinal,
        modalidad,
        tarifaHora: Number(tarifaHora),
        tarifaKm: Number(tarifaKm),
        descripcion,
      }),
    })

    if (!res.ok) {
      setError('No se pudo guardar. Revise que los datos estén completos y sean válidos.')
      return
    }

    setMostrarForm(false)
    cargar()
  }

  async function alternarActiva(o: Oferta): Promise<void> {
    const res = await peticion(`/api/ofertas/${o._id}/activa`, {
      method: 'PUT',
      body: JSON.stringify({ activa: !o.activa }),
    })
    if (res.ok) cargar()
  }

  async function eliminar(): Promise<void> {
    if (!aEliminar) return
    const res = await peticion(`/api/ofertas/${aEliminar._id}`, { method: 'DELETE' })
    setAEliminar(null)
    if (res.ok) cargar()
  }

  if (usuario && !usuario.aprobado) {
    return (
      <Container className="my-4">
        <Alert variant="warning">
          Su perfil de tutor aún está en revisión. Podrá publicar ofertas cuando sea aprobado.
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="titulo-seccion mb-0">
            <i className="bi bi-journal-text"></i>Ofertas
        </h2>
        <Button onClick={abrirNueva}>
          <i className="bi bi-plus-lg me-1"></i>Nueva oferta
        </Button>
      </div>

      {ofertas.length === 0 && (
        <div className="tarjeta text-center text-muted">
          Aún no ha publicado ofertas. Cree la primera para que los estudiantes puedan encontrarlo.
        </div>
      )}

      <Row>
        {ofertas.map(o => (
          <Col md={6} key={o._id} className="mb-3">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <Card.Title>{o.titulo}</Card.Title>
                  <Badge bg={o.activa ? 'success' : 'secondary'}>
                    {o.activa ? 'Activa' : 'Pausada'}
                  </Badge>
                </div>
                <Card.Subtitle className="mb-2 text-muted">
                    {rutaCategoria(o.categoria._id, o.categoria.nombre)} · {etiquetas[o.modalidad]}
                </Card.Subtitle>
                    {usuario && usuario.rol === 'admin' && o.tutor && (
                  <Card.Text className="small mb-2">
                    <i className="bi bi-person me-1"></i>Tutor: <strong>{o.tutor.nombre}</strong>
                  </Card.Text>
                )}
                {o.descripcion && <Card.Text>{o.descripcion}</Card.Text>}
                <Card.Text>
                  <strong>Q{o.tarifaHora}</strong> por hora
                  {o.modalidad === 'casa_estudiante' && (
                    <> · <strong>Q{o.tarifaKm}</strong> por kilómetro</>
                  )}
                </Card.Text>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => abrirEditar(o)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => alternarActiva(o)}>
                  {o.activa ? 'Pausar' : 'Activar'}
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => setAEliminar(o)}>
                  Eliminar
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={mostrarForm} onHide={() => setMostrarForm(false)} centered>
        <Form onSubmit={guardar}>
          <Modal.Header closeButton>
            <Modal.Title>{editando ? 'Editar oferta' : 'Nueva oferta'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control value={titulo} onChange={e => setTitulo(e.target.value)} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Select
                value={principal}
                onChange={e => {
                  setPrincipal(e.target.value)
                  setSubcategoria('')
                }}
                required
              >
                <option value="">Seleccione</option>
                {principales.map(p => (
                  <option key={p._id} value={p._id}>{p.nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {hijas.length > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Subcategoría</Form.Label>
                <Form.Select value={subcategoria} onChange={e => setSubcategoria(e.target.value)} required>
                  <option value="">Seleccione</option>
                  {hijas.map(h => (
                    <option key={h._id} value={h._id}>{h.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Modalidad</Form.Label>
              <Form.Select value={modalidad} onChange={e => setModalidad(e.target.value as Modalidad)}>
                <option value="virtual">Virtual</option>
                <option value="casa_tutor">En casa del tutor</option>
                <option value="casa_estudiante">En casa del estudiante</option>
              </Form.Select>
            </Form.Group>

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Tarifa por hora (Q)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={tarifaHora}
                    onChange={e => setTarifaHora(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              {modalidad === 'casa_estudiante' && (
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Costo por km (Q)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={tarifaKm}
                      onChange={e => setTarifaKm(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>

            <Form.Group>
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarForm(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Ventana
        visible={aEliminar !== null}
        titulo="Eliminar oferta"
        mensaje={aEliminar ? `¿Desea eliminar la oferta "${aEliminar.titulo}"?` : ''}
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={eliminar}
        onCerrar={() => setAEliminar(null)}
      />
    </Container>
  )
}

export default MisOfertas