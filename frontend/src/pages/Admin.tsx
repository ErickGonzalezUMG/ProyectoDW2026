import { Container, Tabs, Tab } from 'react-bootstrap'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminCategorias from '../components/AdminCategorias'
import AdminTutores from '../components/AdminTutores'
import Moderacion from '../components/Moderacion'
import Analiticas from '../components/Analiticas'

function Admin() {
  const { estado } = useAuth()

  if (estado.usuario?.rol !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <Container className="my-4">
      <h2 className="titulo-seccion">
        <i className="bi bi-gear"></i>Panel de administración
      </h2>
      <div className="tarjeta">
        <Tabs defaultActiveKey="categorias" className="mb-4">
          <Tab eventKey="categorias" title="Categorías">
            <AdminCategorias />
          </Tab>
          <Tab eventKey="tutores" title="Tutores">
            <AdminTutores />
          </Tab>
          <Tab eventKey="moderacion" title="Moderación" mountOnEnter>
            <Moderacion />
          </Tab>
          <Tab eventKey="analiticas" title="Analíticas" mountOnEnter>
            <Analiticas />
          </Tab>
        </Tabs>
      </div>
    </Container>
  )
}

export default Admin