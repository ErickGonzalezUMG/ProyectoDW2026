interface Props {
  valor: number
  cantidad?: number
}

function Estrellas({ valor, cantidad }: Props) {
  if (cantidad === 0) {
    return <div className="small text-muted">Sin reseñas</div>
  }

  const llenas = Math.round(valor)

  return (
    <div className="small">
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className={`bi ${n <= llenas ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}></i>
      ))}
      <span className="text-muted">
        {valor.toFixed(1)}
        {cantidad !== undefined && ` (${cantidad})`}
      </span>
    </div>
  )
}

export default Estrellas