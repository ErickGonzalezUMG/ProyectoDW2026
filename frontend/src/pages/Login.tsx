import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Alert } from 'react-bootstrap'
import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import API_URL, { NOMBRE_SISTEMA } from '../config'

function Login() {
  const { estado, dispatch } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (estado.isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [estado.isAuthenticated])

  async function manejarExito(respuesta: CredentialResponse): Promise<void> {
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: respuesta.credential }),
      })
      const datos = await res.json()

      if (!res.ok) {
        setError(
          datos.error === 'cuenta_suspendida'
            ? 'Su cuenta se encuentra suspendida.'
            : 'No fue posible iniciar sesión. Intente nuevamente.'
        )
        return
      }

      dispatch({ type: 'LOGIN', token: datos.token, usuario: datos.usuario })
    } catch {
      setError('No fue posible conectar con el servidor.')
    }
  }

  return (
    <Container className="my-5 tarjeta text-center" style={{ maxWidth: '480px' }}>
      <i className="bi bi-mortarboard-fill icono-marca"></i>
      <h2 className="titulo-seccion mb-1">{NOMBRE_SISTEMA}</h2>
      <p className="text-muted mb-4">
        Plataforma que conecta estudiantes con tutores en idiomas, deportes, ciencias,
        tecnología y posgrados.
      </p>

      {estado.sesionExpirada && (
        <Alert variant="warning">
          Su sesión ya no es válida o ha caducado. Por favor, inicie sesión nuevamente.
        </Alert>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <p className="fw-semibold">Inicie sesión para continuar</p>

      <div className="d-flex justify-content-center">
        <GoogleLogin
          onSuccess={manejarExito}
          onError={() => setError('No fue posible iniciar sesión con Google.')}
        />
      </div>
    </Container>
  )
}

export default Login