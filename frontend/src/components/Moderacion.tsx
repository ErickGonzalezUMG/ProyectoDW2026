import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Spinner, Table, Tab, Tabs } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

interface PersonaResumen {
  _id: string
  nombre: string
  correo: string
  rol: string
  estado?: string
}

interface DenunciaAdmin {
  _id: string
  motivo: string
  estado: 'pendiente' | 'resuelta' | 'descartada'
  createdAt: string
  denunciante: PersonaResumen | null
  denunciado: PersonaResumen | null
  tutoria: { inicio: string; fin: string } | null
}

interface ApelacionAdmin {
  _id: string
  mensaje: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  createdAt: string
  usuario: PersonaResumen | null
  suspension: { motivo: string } | null
}

interface UsuarioLista extends PersonaResumen {
  estado: 'activo' | 'suspendido'
}

const ERRORES: Record<string, string> = {
  motivo_invalido: 'El motivo debe tener entre 5 y 500 caracteres.',
  no_se_puede_suspender_admin: 'No se puede suspender a un administrador.',
  ya_resuelta: 'Este caso ya fue resuelto.',
  ya_suspendido: 'El usuario ya está suspendido.',
  no_esta_suspendido: 'El usuario no está suspendido.',
  usuario_no_encontrado: 'No se encontró el usuario.',
}

function fecha(valor: string): string {
  return new Date(valor).toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Moderacion() {
  const { peticion } = useAuth()
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[]>([])
  const [apelaciones, setApelaciones] = useState<ApelacionAdmin[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

  // Fila con formulario de motivo abierto: "denuncia:ID" o "usuario:ID"
  const [abierto, setAbierto] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [rd, ra, ru] = await Promise.all([
        peticion('/api/moderacion/denuncias'),
        peticion('/api/moderacion/apelaciones'),
        peticion('/api/moderacion/usuarios'),
      ])
      if (rd.ok) setDenuncias(((await rd.json()) as { denuncias: DenunciaAdmin[] }).denuncias)
      if (ra.ok) setApelaciones(((await ra.json()) as { apelaciones: ApelacionAdmin[] }).apelaciones)
      if (ru.ok) setUsuarios(((await ru.json()) as { usuarios: UsuarioLista[] }).usuarios)
    } catch {
      setMensaje({ tipo: 'danger', texto: 'No se pudo cargar la moderación.' })
    } finally {
      setCargando(false)
    }
  }, [peticion])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function ejecutar(ruta: string, cuerpo: Record<string, unknown> | null, exito: string) {
    setEnviando(true)
    setMensaje(null)
    try {
      const r = await peticion(ruta, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo ?? {}),
      })
      if (!r.ok) {
        const datos = (await r.json().catch(() => ({}))) as { error?: string }
        setMensaje({ tipo: 'danger', texto: ERRORES[datos.error ?? ''] ?? 'No se pudo completar la acción.' })
        return
      }
      setMensaje({ tipo: 'success', texto: exito })
      setAbierto(null)
      setMotivo('')
      await cargar()
    } catch {
      setMensaje({ tipo: 'danger', texto: 'Error de conexión con el servidor.' })
    } finally {
      setEnviando(false)
    }
  }

  function abrirMotivo(clave: string) {
    setAbierto(abierto === clave ? null : clave)
    setMotivo('')
  }

  function formularioMotivo(clave: string, onConfirmar: () => void) {
    if (abierto !== clave) return null
    return (
      <div className="mt-2">
        <Form.Control
          as="textarea"
          rows={2}
          maxLength={500}
          placeholder="Motivo de la suspensión (lo verá el usuario)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="d-flex gap-2 mt-2">
          <Button size="sm" variant="danger" disabled={enviando || motivo.trim().length < 5} onClick={onConfirmar}>
            Confirmar suspensión
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setAbierto(null)}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    )
  }

  return (
    <div>
      {mensaje && (
        <Alert variant={mensaje.tipo} dismissible onClose={() => setMensaje(null)}>
          {mensaje.texto}
        </Alert>
      )}

      <Tabs defaultActiveKey="denuncias" className="mb-3">
        <Tab eventKey="denuncias" title={`Denuncias (${denuncias.length})`}>
          {denuncias.length === 0 ? (
            <p className="text-muted">No hay denuncias pendientes.</p>
          ) : (
            denuncias.map((d) => (
              <div key={d._id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <div>
                    <strong>{d.denunciante?.nombre ?? 'Usuario eliminado'}</strong> denunció a{' '}
                    <strong>{d.denunciado?.nombre ?? 'Usuario eliminado'}</strong>{' '}
                    {d.denunciado?.estado === 'suspendido' && <Badge bg="danger">Ya suspendido</Badge>}
                  </div>
                  <small className="text-muted">{fecha(d.createdAt)}</small>
                </div>
                {d.tutoria && (
                  <small className="text-muted d-block">Clase del {fecha(d.tutoria.inicio)}</small>
                )}
                <p className="my-2">{d.motivo}</p>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => abrirMotivo(`denuncia:${d._id}`)}>
                    Suspender al denunciado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={enviando}
                    onClick={() =>
                      void ejecutar(`/api/moderacion/denuncias/${d._id}`, { accion: 'descartar' }, 'Denuncia descartada.')
                    }
                  >
                    Descartar
                  </Button>
                </div>
                {formularioMotivo(`denuncia:${d._id}`, () =>
                  void ejecutar(
                    `/api/moderacion/denuncias/${d._id}`,
                    { accion: 'suspender', motivo: motivo.trim() },
                    'Usuario suspendido y denuncia resuelta.',
                  ),
                )}
              </div>
            ))
          )}
        </Tab>

        <Tab eventKey="apelaciones" title={`Apelaciones (${apelaciones.length})`}>
          {apelaciones.length === 0 ? (
            <p className="text-muted">No hay apelaciones pendientes.</p>
          ) : (
            apelaciones.map((a) => (
              <div key={a._id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <strong>
                    {a.usuario?.nombre ?? 'Usuario eliminado'}{' '}
                    <small className="text-muted">({a.usuario?.correo})</small>
                  </strong>
                  <small className="text-muted">{fecha(a.createdAt)}</small>
                </div>
                <p className="mb-1 mt-2">
                  <strong>Motivo de la suspensión:</strong> {a.suspension?.motivo ?? 'No registrado'}
                </p>
                <p className="mb-2">
                  <strong>Apelación:</strong> {a.mensaje}
                </p>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={enviando}
                    onClick={() =>
                      void ejecutar(`/api/moderacion/apelaciones/${a._id}`, { accion: 'aceptar' }, 'Apelación aceptada: cuenta reactivada.')
                    }
                  >
                    Aceptar y reactivar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={enviando}
                    onClick={() =>
                      void ejecutar(`/api/moderacion/apelaciones/${a._id}`, { accion: 'rechazar' }, 'Apelación rechazada.')
                    }
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          )}
        </Tab>

        <Tab eventKey="usuarios" title="Usuarios">
          <Table responsive hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u._id}>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>{u.rol}</td>
                  <td>
                    <Badge bg={u.estado === 'suspendido' ? 'danger' : 'success'}>
                      {u.estado === 'suspendido' ? 'Suspendido' : 'Activo'}
                    </Badge>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    {u.rol === 'admin' ? (
                      <small className="text-muted">—</small>
                    ) : u.estado === 'suspendido' ? (
                      <Button
                        size="sm"
                        variant="outline-success"
                        disabled={enviando}
                        onClick={() =>
                          void ejecutar(`/api/moderacion/usuarios/${u._id}/reactivar`, null, 'Usuario reactivado.')
                        }
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline-danger" onClick={() => abrirMotivo(`usuario:${u._id}`)}>
                          Suspender
                        </Button>
                        {formularioMotivo(`usuario:${u._id}`, () =>
                          void ejecutar(
                            `/api/moderacion/usuarios/${u._id}/suspender`,
                            { motivo: motivo.trim() },
                            'Usuario suspendido.',
                          ),
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </div>
  )
}

export default Moderacion