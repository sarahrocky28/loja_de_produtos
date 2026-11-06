import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Campo from '../../componentes/Campo'
import { botaoClasse, cartaoClasse } from '../../estilos'

export default function AdminLogin() {
  const { entrar, sair } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    try {
      const usuario = await entrar(email, senha)
      if (usuario.perfil !== 'admin') {
        sair()
        return setErro('Esta conta não tem acesso ao painel.')
      }
      navigate('/admin', { replace: true })
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="px-4 py-16">
      <form onSubmit={enviar} className={`${cartaoClasse} mx-auto max-w-sm space-y-4`}>
        <h1 className="text-center text-lg font-bold">Acesso administrador</h1>
        <Campo label="Login (e-mail)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Campo label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <Link to="/contato" className="block text-right text-xs text-white/60 hover:text-[#35dcee]">Esqueci a senha</Link>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <button type="submit" className={`${botaoClasse} w-full`}>Entrar →</button>
      </form>
    </div>
  )
}
