import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Badge, Button, Form, ListGroup, Spinner } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

interface Interlocutor {
  _id: string
  nombre: string
  foto: string
  rol: string
}

interface MensajeChat {
  _id: string
  de: string
  para: string
  texto: string
  leidoEn: string | null
  createdAt: string
}

interface Conversacion {
  usuario: Interlocutor
  ultimo: { texto: string; createdAt: string; mio: boolean }
  sinLeer: number
}

const ERRORES: Record<string, string> = {
  no_permitido: 'No puede chatear con este usuario.',
  texto_invalido: 'El mensaje debe tener entre 1 y 1000 caracteres.',
  destinatario_suspendido: 'Este usuario tiene la cuenta suspendida.',
}

const ZONA = 'America/Guatemala'

function formatoHora(valor: string): string {
  const fecha = new Date(valor)
  const hoy = new Date()
  const mismoDia =
    fecha.toLocaleDateString('es-GT', { timeZone: ZONA }) === hoy.toLocaleDateString('es-GT', { timeZone: ZONA })
  const hora = fecha.toLocaleTimeString('es-GT', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' })
  if (mismoDia) return hora
  const dia = fecha.toLocaleDateString('es-GT', { timeZone: ZONA, day: '2-digit', month: '2-digit' })
  return `${dia} ${hora}`
}

function Avatar({ u }: { u: Interlocutor }) {
  return u.foto ? (
    <img src={u.foto} alt="" width={36} height={36} className="rounded-circle me-2" referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar-inicial me-2">{u.nombre.charAt(0).toUpperCase()}</span>
  )
}

function ChatFlotante() {
  const { estado: sesion, peticion } = useAuth()
  const { socket, sinLeer, refrescarSinLeer, abierto, conId, abrirChat, cerrarChat, elegirConversacion } = useChat()

  const yo = sesion.usuario?.id ?? ''
  const rol = sesion.usuario?.rol
  const habilitado =
    sesion.isAuthenticated &&
    (rol === 'estudiante' || rol === 'tutor') &&
    sesion.usuario?.estado !== 'suspendido' &&
    sesion.usuario?.perfilCompleto === true

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [activo, setActivo] = useState<Interlocutor | null>(null)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [puedeEscribir, setPuedeEscribir] = useState(false)
  const [cargandoChat, setCargandoChat] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const fondo = useRef<HTMLDivElement>(null)

  const cargarConversaciones = useCallback(async (): Promise<void> => {
    try {
      const r = await peticion('/api/chat/conversaciones')
      if (r.ok) setConversaciones(((await r.json()) as { conversaciones: Conversacion[] }).conversaciones)
    } finally {
      setCargandoLista(false)
    }
  }, [peticion])

  // La lista se carga al abrir la ventana
  useEffect(() => {
    if (habilitado && abierto) void cargarConversaciones()
  }, [habilitado, abierto, cargarConversaciones])

  // Abrir una conversación (el servidor marca sus mensajes como leídos)
  useEffect(() => {
    setError('')
    setTexto('')
    if (!habilitado || !abierto || !conId) {
      setActivo(null)
      setMensajes([])
      return
    }

    let vigente = true
    setCargandoChat(true)
    ;(async () => {
      try {
        const r = await peticion(`/api/chat/con/${conId}`)
        if (!vigente) return
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as { error?: string }
          setActivo(null)
          setMensajes([])
          setError(ERRORES[d.error ?? ''] ?? 'No se pudo abrir la conversación.')
          return
        }
        const d = (await r.json()) as { usuario: Interlocutor; puedeEscribir: boolean; mensajes: MensajeChat[] }
        setActivo(d.usuario)
        setMensajes(d.mensajes)
        setPuedeEscribir(d.puedeEscribir)
        void refrescarSinLeer()
        void cargarConversaciones()
      } finally {
        if (vigente) setCargandoChat(false)
      }
    })()

    return () => {
      vigente = false
    }
  }, [habilitado, abierto, conId, peticion, refrescarSinLeer, cargarConversaciones])

  // Eventos en tiempo real
  useEffect(() => {
    if (!socket || !habilitado || !abierto) return

    const alLlegar = (m: MensajeChat) => {
      if (conId && (m.de === conId || m.para === conId)) {
        setMensajes(prev => (prev.some(x => x._id === m._id) ? prev : [...prev, m]))
        if (m.de === conId) {
          void peticion(`/api/chat/con/${conId}/leer`, { method: 'PUT' }).then(() => refrescarSinLeer())
        }
      }
      void cargarConversaciones()
    }

    const alLeerse = (d: { por: string }) => {
      if (d.por === conId) {
        const ahora = new Date().toISOString()
        setMensajes(prev => prev.map(x => (x.de === yo && !x.leidoEn ? { ...x, leidoEn: ahora } : x)))
      }
    }

    socket.on('mensaje', alLlegar)
    socket.on('leidos', alLeerse)
    return () => {
      socket.off('mensaje', alLlegar)
      socket.off('leidos', alLeerse)
    }
  }, [socket, habilitado, abierto, conId, yo, peticion, refrescarSinLeer, cargarConversaciones])

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes, abierto])

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault()
    const contenido = texto.trim()
    if (!conId || contenido === '') return

    setEnviando(true)
    setError('')
    try {
      const r = await peticion(`/api/chat/con/${conId}`, {
        method: 'POST',
        body: JSON.stringify({ texto: contenido }),
      })
      const d = (await r.json().catch(() => ({}))) as { mensaje?: MensajeChat; error?: string }
      if (r.ok && d.mensaje) {
        const nuevo = d.mensaje
        setMensajes(prev => (prev.some(x => x._id === nuevo._id) ? prev : [...prev, nuevo]))
        setTexto('')
        void cargarConversaciones()
      } else {
        setError(ERRORES[d.error ?? ''] ?? 'No se pudo enviar el mensaje.')
      }
    } catch {
      setError('Error de conexión con el servidor.')
    } finally {
      setEnviando(false)
    }
  }

  if (!habilitado) return null

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        onClick={() => (abierto ? cerrarChat() : abrirChat())}
        aria-label={abierto ? 'Cerrar mensajes' : 'Abrir mensajes'}
      >
        <i className={`bi ${abierto ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
        {!abierto && sinLeer > 0 && (
          <Badge bg="danger" pill className="chat-fab-insignia">
            {sinLeer}
          </Badge>
        )}
      </button>

      {abierto && (
        <div className="chat-panel" role="dialog" aria-label="Mensajes">
          <div className="chat-cabecera">
            {conId && (
              <Button variant="link" className="text-white p-0 me-2" onClick={() => elegirConversacion(null)} aria-label="Volver">
                <i className="bi bi-arrow-left fs-5"></i>
              </Button>
            )}
            {conId && activo ? (
              <>
                <Avatar u={activo} />
                <div className="flex-grow-1 chat-resumen">
                  <strong className="d-block text-truncate">{activo.nombre}</strong>
                  <small>{activo.rol === 'tutor' ? 'Tutor' : 'Estudiante'}</small>
                </div>
              </>
            ) : (
              <strong className="flex-grow-1">
                <i className="bi bi-chat-dots me-2"></i>Mensajes
              </strong>
            )}
            <Button variant="link" className="text-white p-0 ms-2 d-sm-none" onClick={cerrarChat} aria-label="Cerrar">
              <i className="bi bi-x-lg"></i>
            </Button>
          </div>

          <div className="chat-cuerpo">
            {!conId ? (
              cargandoLista ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : conversaciones.length === 0 ? (
                <p className="text-muted p-3 mb-0 small">
                  Aún no tiene conversaciones. Use el botón de chat en la búsqueda de tutores o en el detalle de una clase.
                </p>
              ) : (
                <ListGroup variant="flush" className="chat-lista">
                  {conversaciones.map(c => (
                    <ListGroup.Item
                      key={c.usuario._id}
                      action
                      onClick={() => elegirConversacion(c.usuario._id)}
                      className="d-flex align-items-center"
                    >
                      <Avatar u={c.usuario} />
                      <div className="flex-grow-1 chat-resumen">
                        <div className="d-flex justify-content-between">
                          <strong className="text-truncate">{c.usuario.nombre}</strong>
                          <small className="text-muted ms-2">{formatoHora(c.ultimo.createdAt)}</small>
                        </div>
                        <div className="small text-truncate text-muted">
                          {c.ultimo.mio && 'Usted: '}
                          {c.ultimo.texto}
                        </div>
                      </div>
                      {c.sinLeer > 0 && (
                        <Badge bg="danger" pill className="ms-2">
                          {c.sinLeer}
                        </Badge>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )
            ) : cargandoChat ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : !activo ? (
              <div className="p-3">{error && <Alert variant="danger">{error}</Alert>}</div>
            ) : (
              <>
                <div className="chat-mensajes">
                  {mensajes.length === 0 && <p className="text-muted text-center my-4 small">Escriba el primer mensaje.</p>}
                  {mensajes.map(m => {
                    const mio = m.de === yo
                    return (
                      <div key={m._id} className={`burbuja ${mio ? 'mia' : 'otra'}`}>
                        <div>{m.texto}</div>
                        <small>
                          {formatoHora(m.createdAt)}
                          {mio && (
                            <i
                              className={`bi ${m.leidoEn ? 'bi-check2-all leido' : 'bi-check2'} ms-1`}
                              title={m.leidoEn ? 'Leído' : 'Enviado'}
                            ></i>
                          )}
                        </small>
                      </div>
                    )
                  })}
                  <div ref={fondo}></div>
                </div>

                {error && (
                  <Alert variant="danger" className="m-2 mb-0 py-1 small">
                    {error}
                  </Alert>
                )}

                {puedeEscribir ? (
                  <Form onSubmit={enviar} className="chat-entrada d-flex gap-2">
                    <Form.Control
                      value={texto}
                      maxLength={1000}
                      placeholder="Escriba un mensaje"
                      onChange={e => setTexto(e.target.value)}
                      autoFocus
                    />
                    <Button type="submit" disabled={enviando || texto.trim() === ''}>
                      <i className="bi bi-send"></i>
                    </Button>
                  </Form>
                ) : (
                  <p className="small text-muted p-2 mb-0">No es posible enviar mensajes a este usuario.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ChatFlotante
