import { inputClasse, labelClasse } from '../estilos'

export default function Campo({ label, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClasse}>{label}</span>
      <input className={inputClasse} {...props} />
    </label>
  )
}
