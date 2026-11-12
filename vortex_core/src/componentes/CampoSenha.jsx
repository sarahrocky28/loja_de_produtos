import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { inputClasse, labelClasse } from '../estilos'

export default function CampoSenha({ label, className = '', ...props }) {
  const [visivel, setVisivel] = useState(false)
  return (
    <label className={`block ${className}`}>
      <span className={labelClasse}>{label}</span>
      <div className="relative">
        <input className={`${inputClasse} pr-10`} type={visivel ? 'text' : 'password'} {...props} />
        <button
          type="button"
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisivel((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-lg text-white/70 hover:text-[#35dcee]"
        >
          {visivel ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </label>
  )
}
