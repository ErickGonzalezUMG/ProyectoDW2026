import { Container, Badge, Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Usuario } from '../types'

interface MensajeRol {
  titulo: string
  texto: string
}

const mensajes: Record<Usuario['rol'], MensajeRol> = {
  estudiante: {
    titulo: 'Encuentra a tu tutor ideal',
    texto: 'Busca tutores cerca de ti, compara tarifas y agenda tus clases en minutos.',
  },
  tutor: {
    titulo: 'Gestiona tus clases',
    texto: 'Publica tus ofertas, define tu disponibilidad y atiende a tus estudiantes.',
  },
  admin: {
    titulo: 'Panel de control',
    texto: 'Administra el catálogo de categorías, valida a los tutores y supervisa la plataforma.',
  },
}

function Inicio() {
  const { estado } = useAuth()
  const usuario = estado.usuario

  if (!usuario) {
    return null
  }

  const mensaje = mensajes[usuario.rol]
  const pendiente = usuario.rol === 'tutor' && !usuario.aprobado

  return (
    <Container className="my-4">
      <div className="hero mb-4">
        <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
        <p>{mensaje.texto}</p>
      </div>

      {pendiente && (
        <Alert variant="warning">
          <i className="bi bi-hourglass-split me-2"></i>
          Su perfil de tutor está en revisión. Cuando el administrador lo apruebe, podrá
          publicar ofertas y recibir solicitudes de estudiantes.
        </Alert>
      )}

      <div className="tarjeta d-flex align-items-center">
        {usuario.foto && (
          <img
            src={usuario.foto}
            alt=""
            width={64}
            height={64}
            className="rounded-circle me-3"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex-grow-1">
          <h5 className="mb-1">{usuario.nombre}</h5>
          <div className="text-muted mb-2">{usuario.correo}</div>
          <Badge bg="primary" className="text-capitalize me-2">{usuario.rol}</Badge>
          {usuario.rol === 'tutor' && (
            <Badge bg={usuario.aprobado ? 'success' : 'warning'} text={usuario.aprobado ? undefined : 'dark'}>
              {usuario.aprobado ? 'Perfil aprobado' : 'Pendiente de aprobación'}
            </Badge>
          )}
        </div>
        {usuario.rol === 'admin' && (
          <Link to="/admin" className="btn btn-primary">
            <i className="bi bi-gear me-1"></i>{mensaje.titulo}
          </Link>
        )}
      </div>
    </Container>
  )
}

export default Inicio