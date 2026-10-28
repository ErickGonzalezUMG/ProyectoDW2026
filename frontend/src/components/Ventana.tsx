import { useEffect, useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'

interface Props {
  visible: boolean
  titulo: string
  mensaje?: string
  conTexto?: boolean
  valorInicial?: string
  textoConfirmar?: string
  peligro?: boolean
  onConfirmar: (valor: string) => void
  onCerrar: () => void
}

function Ventana({
  visible,
  titulo,
  mensaje,
  conTexto = false,
  valorInicial = '',
  textoConfirmar = 'Aceptar',
  peligro = false,
  onConfirmar,
  onCerrar,
}: Props) {
  const [valor, setValor] = useState<string>(valorInicial)

  useEffect(() => {
    setValor(valorInicial)
  }, [valorInicial, visible])

  function aceptar(): void {
    if (conTexto && !valor.trim()) return
    onConfirmar(valor)
  }

  return (
    <Modal show={visible} onHide={onCerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {mensaje && <p className="mb-0">{mensaje}</p>}
        {conTexto && (
          <Form.Control value={valor} onChange={e => setValor(e.target.value)} autoFocus />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button variant={peligro ? 'danger' : 'primary'} onClick={aceptar}>
          {textoConfirmar}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default Ventana