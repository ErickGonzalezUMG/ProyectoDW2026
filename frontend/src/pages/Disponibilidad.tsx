import { useEffect, useState } from 'react'
import { Container, Table, Button, Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

interface BloqueDisponibilidad {
  diaSemana: number
  horaInicio: number
  horaFin: number
}

interface Mensaje {
  tipo: 'success' | 'danger'
  texto: string
}

const DIAS = [
  { n: 1, nombre: 'Lunes' },
  { n: 2, nombre: 'Martes' },
  { n: 3, nombre: 'Miércoles' },
  { n: 4, nombre: 'Jueves' },
  { n: 5, nombre: 'Viernes' },
  { n: 6, nombre: 'Sábado' },
  { n: 0, nombre: 'Domingo' },
]

const HORAS: number[] = Array.from({ length: 16 }, (_, i) => i + 6)

function formatoHora(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function Disponibilidad() {
  const { peticion } = useAuth()
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [guardando, setGuardando] = useState<boolean>(false)

  useEffect(() => {
    async function cargar(): Promise<void> {
      const res = await peticion('/api/disponibilidad/mia')
      if (!res.ok) return
      const datos = await res.json()
      const nueva = new Set<string>()
      for (const b of datos.bloques as BloqueDisponibilidad[]) {
        for (let h = b.horaInicio; h < b.horaFin; h++) {
          nueva.add(`${b.diaSemana}-${h}`)
        }
      }
      setSeleccion(nueva)
    }
    cargar()
  }, [])

  function alternar(dia: number, hora: number): void {
    const clave = `${dia}-${hora}`
    setSeleccion(prev => {
      const copia = new Set(prev)
      if (copia.has(clave)) {
        copia.delete(clave)
      } else {
        copia.add(clave)
      }
      return copia
    })
  }

  function armarBloques(): BloqueDisponibilidad[] {
    const bloques: BloqueDisponibilidad[] = []
    for (const dia of DIAS) {
      let inicio: number | null = null
      for (let h = 6; h <= 22; h++) {
        const activa = h < 22 && seleccion.has(`${dia.n}-${h}`)
        if (activa && inicio === null) {
          inicio = h
        }
        if (!activa && inicio !== null) {
          bloques.push({ diaSemana: dia.n, horaInicio: inicio, horaFin: h })
          inicio = null
        }
      }
    }
    return bloques
  }

  async function guardar(): Promise<void> {
    setMensaje(null)
    setGuardando(true)
    const res = await peticion('/api/disponibilidad', {
      method: 'PUT',
      body: JSON.stringify({ bloques: armarBloques() }),
    })
    setGuardando(false)

    if (res.ok) {
      setMensaje({ tipo: 'success', texto: 'Disponibilidad guardada correctamente.' })
    } else {
      setMensaje({ tipo: 'danger', texto: 'No fue posible guardar la disponibilidad.' })
    }
  }

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="titulo-seccion mb-0">
            <i className="bi bi-calendar-week"></i>Disponibilidad semanal
        </h2>
        <div>
          <Button variant="outline-secondary" className="me-2" onClick={() => setSeleccion(new Set())}>
            Limpiar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {mensaje && <Alert variant={mensaje.tipo}>{mensaje.texto}</Alert>}

      <div className="tarjeta">
        <p className="text-muted">
          Este horario <strong>se repite cada semana</strong>: las horas que marque valen para todos
          los lunes, martes, etc., de las semanas siguientes. Haga clic en las horas en las que
          puede dar clases (casillas azules); cada casilla representa una hora completa.
        </p>

        <Table bordered responsive className="tabla-disponibilidad mb-0">
          <thead>
            <tr>
              <th></th>
              {DIAS.map(d => (
                <th key={d.n}>{d.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(h => (
              <tr key={h}>
                <th className="text-nowrap">{formatoHora(h)}</th>
                {DIAS.map(d => (
                  <td
                    key={d.n}
                    className={`celda-disp ${seleccion.has(`${d.n}-${h}`) ? 'activa' : ''}`}
                    onClick={() => alternar(d.n, h)}
                  ></td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  )
}

export default Disponibilidad