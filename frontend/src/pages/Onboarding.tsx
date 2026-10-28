import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Form, Button, Alert, Row, Col } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import SelectorUbicacion from '../components/SelectorUbicacion'
import type { Categoria, Usuario } from '../types'

function Onboarding() {
  const { estado, dispatch, peticion } = useAuth()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [rol, setRol] = useState<'estudiante' | 'tutor'>('estudiante')
  const [telefono, setTelefono] = useState<string>('')
  const [genero, setGenero] = useState<string>('')
  const [direccion, setDireccion] = useState<string>('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [dpi, setDpi] = useState<string>('')
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [hojaVida, setHojaVida] = useState<string>('')
  const [biografia, setBiografia] = useState<string>('')
  const [tarifaBase, setTarifaBase] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [guardando, setGuardando] = useState<boolean>(false)

  useEffect(() => {
    if (!estado.isAuthenticated) {
      navigate('/login')
      return
    }
    if (estado.usuario?.perfilCompleto) {
      navigate('/')
      return
    }
    async function cargar(): Promise<void> {
      const res = await peticion('/api/categorias')
      if (res.ok) {
        const datos = await res.json()
        setCategorias(datos.categorias)
      }
    }
    cargar()
  }, [])

  function alternarCategoria(id: string): void {
    setSeleccion(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]))
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    if (latitud === null || longitud === null) {
      setError('Seleccione su ubicación en el mapa.')
      return
    }

    setGuardando(true)
    const res = await peticion('/api/usuarios/perfil', {
      method: 'PUT',
      body: JSON.stringify({
        rol,
        telefono,
        genero,
        direccion,
        latitud,
        longitud,
        dpi,
        categorias: seleccion,
        hojaVida,
        biografia,
        tarifaBase: Number(tarifaBase),
      }),
    })
    setGuardando(false)

    if (!res.ok) {
      setError('Revise que todos los datos estén completos e intente nuevamente.')
      return
    }

    const datos = await res.json()
    dispatch({ type: 'ACTUALIZAR_USUARIO', usuario: datos.usuario as Usuario })
    navigate('/')
  }

  return (
    <Container className="my-4 tarjeta" style={{ maxWidth: '720px' }}>
      <h2 className="titulo-seccion">Completa tu perfil</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={guardar}>
        <Form.Group className="mb-3">
          <Form.Label>Quiero usar la plataforma como</Form.Label>
          <Form.Select value={rol} onChange={e => setRol(e.target.value as 'estudiante' | 'tutor')}>
            <option value="estudiante">Estudiante</option>
            <option value="tutor">Tutor</option>
          </Form.Select>
        </Form.Group>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono / WhatsApp</Form.Label>
              <Form.Control value={telefono} onChange={e => setTelefono(e.target.value)} required />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Género</Form.Label>
              <Form.Select value={genero} onChange={e => setGenero(e.target.value)} required>
                <option value="">Seleccione</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>DPI</Form.Label>
          <Form.Control value={dpi} onChange={e => setDpi(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Dirección física</Form.Label>
          <Form.Control value={direccion} onChange={e => setDireccion(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Ubicación (haga clic en el mapa)</Form.Label>
          <SelectorUbicacion
            latitud={latitud}
            longitud={longitud}
            onCambio={(lat, lng) => {
              setLatitud(lat)
              setLongitud(lng)
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categorías de interés</Form.Label>
          {categorias.map(c => (
            <Form.Check
              key={c._id}
              type="checkbox"
              label={c.nombre}
              checked={seleccion.includes(c._id)}
              onChange={() => alternarCategoria(c._id)}
            />
          ))}
        </Form.Group>

        {rol === 'tutor' && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Hoja de vida (enlace a PDF) o portafolio</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://"
                value={hojaVida}
                onChange={e => setHojaVida(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Biografía</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={biografia}
                onChange={e => setBiografia(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tarifa base por hora (Q)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={tarifaBase}
                onChange={e => setTarifaBase(e.target.value)}
                required
              />
            </Form.Group>
          </>
        )}

        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar perfil'}
        </Button>
      </Form>
    </Container>
  )
}

export default Onboarding