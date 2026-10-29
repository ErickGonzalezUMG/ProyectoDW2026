import { Container } from 'react-bootstrap'
import { NOMBRE_SISTEMA } from '../config'

function Politicas() {
  return (
    <Container className="my-4" style={{ maxWidth: '820px' }}>
      <div className="tarjeta">
        <h2 className="titulo-seccion">
          <i className="bi bi-shield-check me-2"></i>Políticas de uso de {NOMBRE_SISTEMA}
        </h2>
        <p className="text-muted">
          Estas normas existen para que estudiantes y tutores tengan una experiencia segura y
          respetuosa. Al usar la plataforma usted acepta cumplirlas.
        </p>

        <h5 className="mt-4">1. Respeto y buen trato</h5>
        <p>
          Todo el trato entre estudiantes y tutores debe ser cordial. No se permiten insultos,
          acoso, discriminación ni lenguaje ofensivo, ya sea en las clases o en el chat.
        </p>

        <h5>2. Puntualidad y cumplimiento</h5>
        <p>
          Las clases aprobadas deben cumplirse en el horario acordado. Si no puede asistir, cancele
          la clase con la mayor anticipación posible para liberar el horario del otro usuario.
        </p>

        <h5>3. Información veraz</h5>
        <p>
          Los datos del perfil, la hoja de vida y las ofertas deben ser reales. Los tutores no deben
          declarar estudios o experiencia que no tengan.
        </p>

        <h5>4. Tarifas y pagos</h5>
        <p>
          El precio de cada clase es el que se muestra en la oferta, incluido el traslado cuando
          aplica. No se deben exigir cobros adicionales no acordados en la plataforma.
        </p>

        <h5>5. Privacidad y seguridad</h5>
        <p>
          No comparta datos personales de otras personas ni use la información de la plataforma para
          fines distintos a las clases. Para clases presenciales, actúe con la debida precaución.
        </p>

        <h5>6. Reseñas honestas</h5>
        <p>
          Las calificaciones y comentarios deben reflejar la experiencia real de la clase. No se
          permiten reseñas falsas ni coordinadas.
        </p>

        <h5>7. Denuncias y suspensión</h5>
        <p>
          Cualquier usuario puede denunciar a la otra persona de una clase en la que participó. El
          administrador revisa cada denuncia y puede suspender la cuenta cuando se comprueba una
          falta a estas políticas. Un usuario suspendido puede iniciar sesión, pero solo ve su
          estado de suspensión, el motivo y el formulario de apelación.
        </p>

        <h5>8. Apelación</h5>
        <p>
          Quien considere injusta una suspensión puede enviar una apelación desde su pantalla de
          suspensión. El administrador la revisa: si la acepta, la cuenta se reactiva; si la
          rechaza, la suspensión continúa y puede enviarse una nueva apelación con más información.
        </p>
      </div>
    </Container>
  )
}

export default Politicas