import { Navbar, Container, Nav, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NOMBRE_SISTEMA } from '../config'

function BarraNavegacion() {
  const { estado, dispatch } = useAuth()
  const usuario = estado.usuario
  const conSesion = estado.isAuthenticated && usuario !== null
  const esAdmin = conSesion && usuario.rol === 'admin'
  const puedeBuscar = conSesion && (usuario.rol === 'estudiante' || esAdmin)
  const puedeOfertar = conSesion && (usuario.rol === 'tutor' || esAdmin)

  return (
    <Navbar variant="dark" expand="md" className="barra-principal">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <i className="bi bi-mortarboard-fill me-2"></i>{NOMBRE_SISTEMA}
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            {conSesion && (
              <Nav.Link as={Link} to="/">
                <i className="bi bi-house-door me-1"></i>Inicio
              </Nav.Link>
            )}
            {conSesion && (
              <Nav.Link as={Link} to="/calendario">
                <i className="bi bi-calendar3 me-1"></i>Calendario
              </Nav.Link>
            )}
            {puedeBuscar && (
              <Nav.Link as={Link} to="/buscar">
                <i className="bi bi-search me-1"></i>Buscar tutores
              </Nav.Link>
            )}
            {puedeOfertar && (
              <Nav.Link as={Link} to="/ofertas">
                <i className="bi bi-journal-text me-1"></i>Ofertas
              </Nav.Link>
            )}
            {puedeOfertar && (
              <Nav.Link as={Link} to="/disponibilidad">
                <i className="bi bi-calendar-week me-1"></i>Disponibilidad
              </Nav.Link>
            )}
            {esAdmin && (
              <Nav.Link as={Link} to="/admin">
                <i className="bi bi-gear me-1"></i>Administración
              </Nav.Link>
            )}
          </Nav>
          {conSesion ? (
            <>
              <span className="text-light me-3 d-flex align-items-center">
                {usuario.foto && (
                  <img src={usuario.foto} alt="" className="avatar" referrerPolicy="no-referrer" />
                )}
                {usuario.nombre}
              </span>
              <Button variant="outline-light" size="sm" onClick={() => dispatch({ type: 'LOGOUT' })}>
                <i className="bi bi-box-arrow-right me-1"></i>Cerrar sesión
              </Button>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline-light btn-sm">
              <i className="bi bi-box-arrow-in-right me-1"></i>Iniciar sesión
            </Link>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default BarraNavegacion