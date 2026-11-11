import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Campo from '../componentes/Campo'
import CampoSenha from '../componentes/CampoSenha'
import { botaoClasse, cartaoClasse, paginaClasse } from '../estilos'

export default function Cadastro() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const local = useLocation()
  const [form, setForm] = useState({ nome: '', sobrenome: '', email: '', senha: '', confirmar: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) return setErro('As senhas não são iguais.')
    setEnviando(true)
    try {
      await cadastrar({
        nome: `${form.nome} ${form.sobrenome}`.trim(),
        email: form.email,
        senha: form.senha,
      })
      navigate(local.state?.de || '/', { replace: true })
    } catch (err) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className={`${paginaClasse} px-4 py-12 md:px-8`}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-white/70">Inicie sua jornada Vortex</p>
          <h1 className="mt-2 text-2xl font-extrabold uppercase md:text-4xl">Seja bem-vindo!</h1>
          <p className="mt-3 text-sm text-white/70">Essência do treino. Identidade de quem não para.</p>
        </div>

        <form onSubmit={enviar} className={`${cartaoClasse} space-y-3`}>
          <h2 className="text-center text-lg font-bold">Crie sua conta!</h2>
          <Campo label="Nome" value={form.nome} onChange={set('nome')} required />
          <Campo label="Sobrenome" value={form.sobrenome} onChange={set('sobrenome')} required />
          <Campo label="E-mail" type="email" value={form.email} onChange={set('email')} required />
          <CampoSenha label="Senha" minLength={6} value={form.senha} onChange={set('senha')} required />
          <CampoSenha label="Confirmar senha" value={form.confirmar} onChange={set('confirmar')} required />
          {erro && <p className="text-sm text-red-400">{erro}</p>}
          <button type="submit" disabled={enviando} className={`${botaoClasse} w-full`}>
            {enviando ? 'Criando...' : 'Cadastrar'}
          </button>
          <p className="text-center text-xs text-white/70">
            Já tem conta? <Link to="/login" className="font-bold text-[#35dcee] hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
