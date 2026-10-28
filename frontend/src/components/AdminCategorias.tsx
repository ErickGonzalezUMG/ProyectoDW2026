import { useEffect, useState } from 'react'
import { Button, Form, InputGroup, ListGroup, Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import Ventana from './Ventana'
import type { Categoria } from '../types'

function AdminCategorias() {
  const { peticion } = useAuth()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState<string>('')
  const [padre, setPadre] = useState<string>('')
  const [mensaje, setMensaje] = useState<string>('')
  const [aRenombrar, setARenombrar] = useState<Categoria | null>(null)
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null)

  async function cargar(): Promise<void> {
    const res = await peticion('/api/categorias')
    if (res.ok) {
      const datos = await res.json()
      setCategorias(datos.categorias)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setMensaje('')
    const res = await peticion('/api/categorias', {
      method: 'POST',
      body: JSON.stringify({ nombre, padre: padre || null }),
    })
    if (res.ok) {
      setNombre('')
      setPadre('')
      cargar()
    } else {
      setMensaje('No se pudo crear la categoría.')
    }
  }

  async function renombrar(valor: string): Promise<void> {
    if (!aRenombrar) return
    const res = await peticion(`/api/categorias/${aRenombrar._id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre: valor }),
    })
    setARenombrar(null)
    if (res.ok) cargar()
  }

  async function eliminar(): Promise<void> {
    if (!aEliminar) return
    setMensaje('')
    const res = await peticion(`/api/categorias/${aEliminar._id}`, { method: 'DELETE' })
    setAEliminar(null)
    if (res.ok) {
      cargar()
      return
    }
    const datos = await res.json()
    setMensaje(
      datos.error === 'tiene_subcategorias'
        ? 'No se puede eliminar: tiene subcategorías.'
        : datos.error === 'categoria_en_uso'
        ? 'No se puede eliminar: hay usuarios que la usan.'
        : 'No se pudo eliminar.'
    )
  }

  const principales = categorias.filter(c => c.padre === null)

  return (
    <div>
      {mensaje && <Alert variant="warning">{mensaje}</Alert>}

      <Form onSubmit={crear} className="mb-4">
        <InputGroup>
          <Form.Control
            placeholder="Nombre de la categoría"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <Form.Select value={padre} onChange={e => setPadre(e.target.value)}>
            <option value="">Categoría principal</option>
            {principales.map(c => (
              <option key={c._id} value={c._id}>Subcategoría de {c.nombre}</option>
            ))}
          </Form.Select>
          <Button type="submit">Agregar</Button>
        </InputGroup>
      </Form>

      <ListGroup>
        {principales.map(p => (
          <ListGroup.Item key={p._id}>
            <div className="d-flex justify-content-between align-items-center">
              <strong>{p.nombre}</strong>
              <span>
                <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setARenombrar(p)}>Renombrar</Button>
                <Button size="sm" variant="outline-danger" onClick={() => setAEliminar(p)}>Eliminar</Button>
              </span>
            </div>
            {categorias.filter(h => h.padre === p._id).map(h => (
              <div key={h._id} className="d-flex justify-content-between align-items-center ms-4 mt-2">
                <span>{h.nombre}</span>
                <span>
                  <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setARenombrar(h)}>Renombrar</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => setAEliminar(h)}>Eliminar</Button>
                </span>
              </div>
            ))}
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Ventana
        visible={aRenombrar !== null}
        titulo="Renombrar categoría"
        conTexto
        valorInicial={aRenombrar ? aRenombrar.nombre : ''}
        textoConfirmar="Guardar"
        onConfirmar={renombrar}
        onCerrar={() => setARenombrar(null)}
      />
      <Ventana
        visible={aEliminar !== null}
        titulo="Eliminar categoría"
        mensaje={aEliminar ? `¿Desea eliminar la categoría "${aEliminar.nombre}"?` : ''}
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={eliminar}
        onCerrar={() => setAEliminar(null)}
      />
    </div>
  )
}

export default AdminCategorias