import { useEffect, useState } from 'react'
import { Button, Card, Badge } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import type { TutorAdmin } from '../types'

function AdminTutores() {
  const { peticion } = useAuth()
  const [tutores, setTutores] = useState<TutorAdmin[]>([])

  async function cargar(): Promise<void> {
    const res = await peticion('/api/admin/tutores')
    if (res.ok) {
      const datos = await res.json()
      setTutores(datos.tutores)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function cambiarAprobacion(id: string, aprobado: boolean): Promise<void> {
    const res = await peticion(`/api/admin/tutores/${id}/aprobar`, {
      method: 'PUT',
      body: JSON.stringify({ aprobado }),
    })
    if (res.ok) cargar()
  }

  if (tutores.length === 0) {
    return <p className="text-muted">No hay tutores registrados.</p>
  }

  return (
    <div>
      {tutores.map(t => (
        <Card key={t._id} className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <Card.Title>{t.nombre}</Card.Title>
              <Badge bg={t.aprobado ? 'success' : 'warning'}>
                {t.aprobado ? 'Aprobado' : 'Pendiente'}
              </Badge>
            </div>
            <Card.Subtitle className="mb-2 text-muted">{t.correo} · {t.telefono}</Card.Subtitle>
            <Card.Text>{t.biografia}</Card.Text>
            <Card.Text>
              Tarifa base: Q{t.tarifaBase}/h · Categorías: {t.categorias.map(c => c.nombre).join(', ')}
            </Card.Text>
            <a href={t.hojaVida} target="_blank" rel="noreferrer" className="me-3">Ver hoja de vida</a>
            {t.aprobado ? (
              <Button size="sm" variant="outline-danger" onClick={() => cambiarAprobacion(t._id, false)}>Revocar</Button>
            ) : (
              <Button size="sm" variant="success" onClick={() => cambiarAprobacion(t._id, true)}>Aprobar</Button>
            )}
          </Card.Body>
        </Card>
      ))}
    </div>
  )
}

export default AdminTutores