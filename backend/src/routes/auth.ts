import { Router } from 'express'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import Usuario from '../models/Usuario'
import { validarToken } from '../middleware/validarToken'
import type { RequestAutenticado } from '../middleware/validarToken'

const router = Router()
const clienteGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function datosPublicos(usuario: InstanceType<typeof Usuario>) {
  return {
    id: String(usuario._id),
    nombre: usuario.nombre,
    correo: usuario.correo,
    foto: usuario.foto,
    rol: usuario.rol,
    perfilCompleto: usuario.perfilCompleto,
    aprobado: usuario.aprobado,
    estado: usuario.estado,
  }
}

router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body as { credential?: string }

  if (!credential) {
    res.status(400).json({ error: 'credencial_requerida' })
    return
  }

  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const datos = ticket.getPayload()

    if (!datos || !datos.email) {
      res.status(401).json({ error: 'token_google_invalido' })
      return
    }

    let usuario = await Usuario.findOne({ correo: datos.email.toLowerCase() })

    if (!usuario) {
      usuario = await Usuario.create({
        nombre: datos.name || datos.email,
        correo: datos.email.toLowerCase(),
        foto: datos.picture || '',
      })
    }

    const token = jwt.sign(
      { id: String(usuario._id), rol: usuario.rol },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '5m') as jwt.SignOptions['expiresIn'] }
    )

    res.json({ token, usuario: datosPublicos(usuario) })
  } catch (error) {
    res.status(401).json({ error: 'token_google_invalido' })
  }
})

router.get('/yo', validarToken, async (req: RequestAutenticado, res: Response): Promise<void> => {
  const usuario = await Usuario.findById(req.usuarioId)

  if (!usuario) {
    res.status(401).json({ error: 'token_invalido' })
    return
  }

  res.json({ usuario: datosPublicos(usuario) })
})

export default router