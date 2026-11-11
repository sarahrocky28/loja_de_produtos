import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Campo from '../componentes/Campo'
import { botaoClasse, cartaoClasse, paginaClasse } from '../estilos'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState({ enviando: false, mensagem: '', erro: '' })

  async function enviar(e) {
    e.preventDefault()
    setEstado({ enviando: true, mensagem: '', erro: '' })
    try {
      const d = await api('/auth/esqueci-senha', { method: 'POST', corpo: { email } })
      setEstado({ enviando: false, mensagem: d.mensagem, erro: '' })
    } catch (err) {
      setEstado({ enviando: false, mensagem: '', erro: err.message })
    }
  }

  return (
    <div className={`${paginaClasse} px-4 py-16`}>
      <form onSubmit={enviar} className={`${cartaoClasse} mx-auto max-w-sm space-y-4`}>
        <h1 className="text-center text-lg font-bold">Esqueci minha senha</h1>
        <p className="text-sm text-white/70">Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        <Campo label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
        {estado.mensagem && <p className="text-sm text-[#35dcee]">{estado.mensagem}</p>}
        <button type="submit" disabled={estado.enviando} className={`${botaoClasse} w-full`}>
          {estado.enviando ? 'Enviando...' : 'Enviar link'}
        </button>
        <p className="text-center text-xs text-white/70">
          <Link to="/login" className="font-bold text-[#35dcee] hover:underline">Voltar para o login</Link>
        </p>
      </form>
    </div>
  )
}
