import { Fragment, useCallback, useEffect, useState } from 'react'
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
  tipo?: 'inasistencia' | 'conducta_inapropiada' | 'cobros_indebidos'
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

const ESTADO_DENUNCIA: Record<DenunciaAdmin['estado'], { texto: string; color: string }> = {
  pendiente: { texto: 'Pendiente', color: 'warning' },
  resuelta: { texto: 'Resuelta (usuario suspendido)', color: 'danger' },
  descartada: { texto: 'Descartada', color: 'secondary' },
}

const TIPO_DENUNCIA: Record<string, string> = {
  inasistencia: 'Inasistencia',
  conducta_inapropiada: 'Conducta inapropiada',
  cobros_indebidos: 'Cobros indebidos',
}

function etiquetaTipo(tipo?: string): string {
  return (tipo && TIPO_DENUNCIA[tipo]) || 'Sin tipo'
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
  const [primeraCarga, setPrimeraCarga] = useState(true)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

  // Pestaña activa (se conserva al recargar los datos) y filtro de historial
  const [pestana, setPestana] = useState('denuncias')
  const [historial, setHistorial] = useState(false)

  // Fila con formulario de motivo abierto: "denuncia:ID" o "usuario:ID"
  const [abierto, setAbierto] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Historial de reportes de un usuario (pestaña Usuarios)
  const [reportesDe, setReportesDe] = useState<string | null>(null)
  const [reportes, setReportes] = useState<DenunciaAdmin[] | null>(null)

  const cargar = useCallback(async () => {
    try {
      const estadoDenuncias = historial ? '?estado=todas' : ''
      const [rd, ra, ru] = await Promise.all([
        peticion(`/api/moderacion/denuncias${estadoDenuncias}`),
        peticion('/api/moderacion/apelaciones'),
        peticion('/api/moderacion/usuarios'),
      ])
      if (rd.ok) setDenuncias(((await rd.json()) as { denuncias: DenunciaAdmin[] }).denuncias)
      if (ra.ok) setApelaciones(((await ra.json()) as { apelaciones: ApelacionAdmin[] }).apelaciones)
      if (ru.ok) setUsuarios(((await ru.json()) as { usuarios: UsuarioLista[] }).usuarios)
    } catch {
      setMensaje({ tipo: 'danger', texto: 'No se pudo cargar la moderación.' })
    } finally {
      setPrimeraCarga(false)
    }
  }, [peticion, historial])

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

  async function verReportes(usuarioId: string): Promise<void> {
    if (reportesDe === usuarioId) {
      setReportesDe(null)
      return
    }
    setReportesDe(usuarioId)
    setReportes(null)
    try {
      const r = await peticion(`/api/moderacion/denuncias?usuario=${usuarioId}`)
      setReportes(r.ok ? ((await r.json()) as { denuncias: DenunciaAdmin[] }).denuncias : [])
    } catch {
      setReportes([])
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

  if (primeraCarga) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    )
  }

  const pendientes = denuncias.filter(d => d.estado === 'pendiente').length

  return (
    <div>
      {mensaje && (
        <Alert variant={mensaje.tipo} dismissible onClose={() => setMensaje(null)}>
          {mensaje.texto}
        </Alert>
      )}

      <Tabs activeKey={pestana} onSelect={(k) => setPestana(k ?? 'denuncias')} className="mb-3 pestanas-scroll">
        <Tab eventKey="denuncias" title={`Denuncias (${pendientes})`}>
          <Form.Check
            type="switch"
            id="ver-historial"
            className="mb-3"
            label="Ver historial completo (incluye resueltas y descartadas)"
            checked={historial}
            onChange={(e) => setHistorial(e.target.checked)}
          />
          {denuncias.length === 0 ? (
            <p className="text-muted">
              {historial ? 'No hay denuncias registradas.' : 'No hay denuncias pendientes.'}
            </p>
          ) : (
            denuncias.map((d) => (
              <div key={d._id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <div>
                    <strong>{d.denunciante?.nombre ?? 'Usuario eliminado'}</strong> denunció a{' '}
                    <strong>{d.denunciado?.nombre ?? 'Usuario eliminado'}</strong>{' '}
                    {d.denunciado?.estado === 'suspendido' && <Badge bg="danger">Ya suspendido</Badge>}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={ESTADO_DENUNCIA[d.estado].color}>{ESTADO_DENUNCIA[d.estado].texto}</Badge>
                    <small className="text-muted">{fecha(d.createdAt)}</small>
                  </div>
                </div>
                {d.tutoria && (
                  <small className="text-muted d-block">Clase del {fecha(d.tutoria.inicio)}</small>
                )}
                <p className="my-2">
                  <Badge bg="dark" className="me-2">{etiquetaTipo(d.tipo)}</Badge>
                  {d.motivo}
                </p>
                {d.estado === 'pendiente' && (
                  <>
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
                  </>
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
                <Fragment key={u._id}>
                  <tr>
                    <td>{u.nombre}</td>
                    <td>{u.correo}</td>
                    <td>{u.rol}</td>
                    <td>
                      <Badge bg={u.estado === 'suspendido' ? 'danger' : 'success'}>
                        {u.estado === 'suspendido' ? 'Suspendido' : 'Activo'}
                      </Badge>
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline-secondary" onClick={() => void verReportes(u._id)}>
                          {reportesDe === u._id ? 'Ocultar reportes' : 'Ver reportes'}
                        </Button>
                        {u.rol === 'admin' ? null : u.estado === 'suspendido' ? (
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
                          <Button size="sm" variant="outline-danger" onClick={() => abrirMotivo(`usuario:${u._id}`)}>
                            Suspender
                          </Button>
                        )}
                      </div>
                      {formularioMotivo(`usuario:${u._id}`, () =>
                        void ejecutar(
                          `/api/moderacion/usuarios/${u._id}/suspender`,
                          { motivo: motivo.trim() },
                          'Usuario suspendido.',
                        ),
                      )}
                    </td>
                  </tr>
                  {reportesDe === u._id && (
                    <tr>
                      <td colSpan={5} className="bg-light">
                        {reportes === null ? (
                          <Spinner animation="border" size="sm" />
                        ) : reportes.length === 0 ? (
                          <small className="text-muted">Este usuario no tiene reportes.</small>
                        ) : (
                          reportes.map((d) => {
                            const recibido = d.denunciado?._id === u._id
                            return (
                              <div key={d._id} className="border-bottom py-2">
                                <div className="d-flex justify-content-between flex-wrap gap-2">
                                  <span>
                                    {recibido
                                      ? `Recibido de ${d.denunciante?.nombre ?? 'usuario eliminado'}`
                                      : `Enviado contra ${d.denunciado?.nombre ?? 'usuario eliminado'}`}
                                  </span>
                                  <span className="d-flex align-items-center gap-2">
                                    <Badge bg={ESTADO_DENUNCIA[d.estado].color}>{ESTADO_DENUNCIA[d.estado].texto}</Badge>
                                    <small className="text-muted">{fecha(d.createdAt)}</small>
                                  </span>
                                </div>
                                <div>
                                  <Badge bg="dark" className="me-2">{etiquetaTipo(d.tipo)}</Badge>
                                  {d.motivo}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </div>
  )
}

export default Moderacion
