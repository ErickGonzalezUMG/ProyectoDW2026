import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import API_URL from '../config'
import { useAuth } from './AuthContext'

interface ChatContextoTipo {
  socket: Socket | null
  sinLeer: number
  refrescarSinLeer: () => Promise<void>
  abierto: boolean
  conId: string | null
  abrirChat: (usuarioId?: string) => void
  cerrarChat: () => void
  elegirConversacion: (usuarioId: string | null) => void
}

const ChatContext = createContext<ChatContextoTipo>({
  socket: null,
  sinLeer: 0,
  refrescarSinLeer: async () => {},
  abierto: false,
  conId: null,
  abrirChat: () => {},
  cerrarChat: () => {},
  elegirConversacion: () => {},
})

function ChatProvider({ children }: { children: ReactNode }) {
  const { estado, peticion } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sinLeer, setSinLeer] = useState<number>(0)
  const [abierto, setAbierto] = useState<boolean>(false)
  const [conId, setConId] = useState<string | null>(null)

  const token = estado.token
  const rol = estado.usuario?.rol
  const suspendido = estado.usuario?.estado === 'suspendido'
  const habilitado = Boolean(token) && (rol === 'estudiante' || rol === 'tutor') && !suspendido

  const refrescarSinLeer = useCallback(async (): Promise<void> => {
    try {
      const r = await peticion('/api/chat/sin-leer')
      if (r.ok) setSinLeer(((await r.json()) as { total: number }).total)
    } catch {
      /* el contador es informativo; si falla se conserva el valor anterior */
    }
  }, [peticion])

  // Conexión en tiempo real autenticada con el JWT de la sesión
  useEffect(() => {
    if (!habilitado || !token) {
      setSocket(null)
      setSinLeer(0)
      setAbierto(false)
      setConId(null)
      return
    }

    const conexion = io(API_URL, { auth: { token } })
    setSocket(conexion)
    void refrescarSinLeer()

    conexion.on('mensaje', () => {
      void refrescarSinLeer()
    })

    return () => {
      conexion.disconnect()
      setSocket(null)
    }
  }, [habilitado, token, refrescarSinLeer])

  // Abre la ventana flotante; con un ID, directamente en esa conversación
  const abrirChat = useCallback((usuarioId?: string): void => {
    setConId(usuarioId ?? null)
    setAbierto(true)
  }, [])

  const cerrarChat = useCallback((): void => {
    setAbierto(false)
    setConId(null)
  }, [])

  const elegirConversacion = useCallback((usuarioId: string | null): void => {
    setConId(usuarioId)
  }, [])

  return (
    <ChatContext.Provider
      value={{ socket, sinLeer, refrescarSinLeer, abierto, conId, abrirChat, cerrarChat, elegirConversacion }}
    >
      {children}
    </ChatContext.Provider>
  )
}

function useChat(): ChatContextoTipo {
  return useContext(ChatContext)
}

export { ChatProvider, useChat }
