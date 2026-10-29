import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import type { Usuario } from '../types'

interface Props {
  children: ReactNode
  roles?: Usuario['rol'][]
}

function RutaPrivada({ children, roles }: Props) {
  const { estado } = useAuth()

  if (!estado.isAuthenticated || !estado.usuario) {
    return <Navigate to="/login" replace />
  }

  if (estado.usuario.estado === 'suspendido') {
    return <Navigate to="/suspendido" replace />
  }

  if (!estado.usuario.perfilCompleto) {
    return <Navigate to="/onboarding" replace />
  }

  if (roles && !roles.includes(estado.usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RutaPrivada