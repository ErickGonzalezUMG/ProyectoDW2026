import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function VigilanteSesion() {
  const { estado } = useAuth()
  const navigate = useNavigate()

  useEffect(
    function () {
      if (estado.sesionExpirada) {
        navigate('/login')
      }
    },
    [estado.sesionExpirada, navigate]
  )

  return null
}

export default VigilanteSesion