import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Campo from '../componentes/Campo'
import { botaoClasse, cartaoClasse, paginaClasse } from '../estilos'

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const local = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const usuario = await entrar(email, senha)
      // volta para onde o cliente estava (ex.: o carrinho) ou vai para o início
      navigate(usuario.perfil === 'admin' ? '/admin' : local.state?.de || '/', { replace: true })
    } catch (err) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className={`${paginaClasse} px-4 py-12 md:px-8`}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-white/70">Sua jornada Vortex</p>
          <h1 className="mt-2 text-2xl font-extrabold uppercase md:text-4xl">Bom ter você de volta.</h1>
          <p className="mt-3 text-sm text-white/70">Essência do treino. Identidade de quem não para.</p>
        </div>

        <form onSubmit={enviar} className={`${cartaoClasse} space-y-4`}>
          <h2 className="text-center text-lg font-bold">Entrar na sua conta</h2>
          <Campo label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Campo label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <Link to="/contato" className="block text-right text-xs text-white/60 hover:text-[#35dcee]">
            Esqueci a conta
          </Link>
          {erro && <p className="text-sm text-red-400">{erro}</p>}
          <button type="submit" disabled={enviando} className={`${botaoClasse} w-full`}>
            {enviando ? 'Entrando...' : 'Entrar →'}
          </button>
          <p className="text-center text-xs text-white/70">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" state={local.state} className="font-bold text-[#35dcee] hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
