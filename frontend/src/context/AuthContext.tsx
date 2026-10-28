import { createContext, useContext, useReducer, useEffect } from 'react'
import type { Dispatch, ReactNode } from 'react'
import API_URL from '../config'
import type { Usuario } from '../types'

interface EstadoAuth {
  isAuthenticated: boolean
  usuario: Usuario | null
  token: string | null
  sesionExpirada: boolean
}

type Accion =
  | { type: 'LOGIN'; usuario: Usuario; token: string }
  | { type: 'LOGOUT' }
  | { type: 'SESION_EXPIRADA' }
  | { type: 'ACTUALIZAR_USUARIO'; usuario: Usuario }

interface AuthContextTipo {
  estado: EstadoAuth
  dispatch: Dispatch<Accion>
  peticion: (ruta: string, opciones?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextTipo>({} as AuthContextTipo)

const tokenGuardado = localStorage.getItem('token')
const usuarioGuardado = localStorage.getItem('usuario')

const estadoInicial: EstadoAuth = {
  isAuthenticated: tokenGuardado && usuarioGuardado ? true : false,
  usuario: usuarioGuardado ? JSON.parse(usuarioGuardado) : null,
  token: tokenGuardado,
  sesionExpirada: false,
}

function authReducer(estado: EstadoAuth, accion: Accion): EstadoAuth {
  switch (accion.type) {
    case 'LOGIN':
      return {
        ...estado,
        isAuthenticated: true,
        usuario: accion.usuario,
        token: accion.token,
        sesionExpirada: false,
      }
    case 'LOGOUT':
      return {
        ...estado,
        isAuthenticated: false,
        usuario: null,
        token: null,
        sesionExpirada: false,
      }
    case 'SESION_EXPIRADA':
      return { ...estado, sesionExpirada: true }
    case 'ACTUALIZAR_USUARIO':
      return { ...estado, usuario: accion.usuario }
    default:
      return estado
  }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(authReducer, estadoInicial)

  useEffect(
    function () {
      if (estado.token && estado.usuario) {
        localStorage.setItem('token', estado.token)
        localStorage.setItem('usuario', JSON.stringify(estado.usuario))
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
      }
    },
    [estado.token, estado.usuario]
  )

  // Función central: todas las peticiones protegidas pasan por aquí
  async function peticion(ruta: string, opciones?: RequestInit): Promise<Response> {
    const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' }

    if (estado.token) {
      cabeceras.Authorization = `Bearer ${estado.token}`
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: cabeceras,
    })

    // Token ausente, inválido o vencido: cerrar sesión y avisar
    if (respuesta.status === 401) {
      dispatch({ type: 'LOGOUT' })
      dispatch({ type: 'SESION_EXPIRADA' })
    }

    return respuesta
  }

  return (
    <AuthContext.Provider value={{ estado, dispatch, peticion }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  return useContext(AuthContext)
}

export { AuthProvider, useAuth }