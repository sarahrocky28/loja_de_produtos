import { useEffect, useState } from 'react'
import { api } from '../../api'
import Campo from '../../componentes/Campo'
import Erro500 from '../../componentes/Erro500'
import { botaoClasse, botaoTealClasse, cartaoClasse, inputClasse } from '../../estilos'
import { formatarData } from '../../utils/status'

export default function AdminClientes() {
  const [clientes, setClientes] = useState(null)
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [erroGeral, setErroGeral] = useState(false)

  function carregar(termo = busca) {
    api(`/admin/clientes?busca=${encodeURIComponent(termo)}`)
      .then((d) => setClientes(d.clientes))
      .catch(() => setErroGeral(true))
  }
  useEffect(() => carregar(''), [])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    try {
      await api('/admin/clientes', { method: 'POST', corpo: form })
      setForm(null)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function alternar(c) {
    await api(`/admin/clientes/${c.id}`, { method: 'PATCH', corpo: { ativo: !c.ativo } }).catch(() => {})
    carregar()
  }

  if (erroGeral) return <Erro500 />

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase">Clientes</h1>
        <div className="flex gap-2">
          <input value={busca} onChange={(e) => { setBusca(e.target.value); carregar(e.target.value) }} placeholder="Buscar cliente" className={`${inputClasse} !w-48`} />
          <button type="button" onClick={() => { setErro(''); setForm({ nome: '', email: '', senha: '' }) }} className={botaoClasse}>Cadastrar</button>
        </div>
      </div>

      {form && (
        <form onSubmit={salvar} className={`${cartaoClasse} mt-6 grid gap-3 sm:grid-cols-3`}>
          <Campo label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <Campo label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Campo label="Senha" type="password" minLength={6} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
          {erro && <p className="text-sm text-red-400 sm:col-span-3">{erro}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className={botaoTealClasse}>Salvar</button>
            <button type="button" onClick={() => setForm(null)} className="rounded border border-white/30 px-4 py-2 text-sm font-bold uppercase">Cancelar</button>
          </div>
        </form>
      )}

      <h2 className="mt-10 text-center text-sm font-bold uppercase tracking-wide text-white/70">Clientes cadastrados</h2>
      {!clientes ? (
        <p className="py-10 text-center text-white/70">Carregando...</p>
      ) : (
        <div className="mt-4 space-y-2">
          {clientes.map((c) => (
            <article key={c.id} className={`${cartaoClasse} flex flex-wrap items-center gap-3 !p-3 text-sm ${c.ativo ? '' : 'opacity-50'}`}>
              <div className="flex-1">
                <p className="font-bold">{c.nome}</p>
                <p className="text-white/60">{c.email} · desde {formatarData(c.criado_em)}</p>
              </div>
              <button type="button" onClick={() => alternar(c)} className="rounded border border-white/30 px-3 py-1 text-xs font-bold uppercase hover:border-[#35dcee]">
                {c.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </article>
          ))}
          {clientes.length === 0 && <p className="py-10 text-center text-white/60">Nenhum cliente encontrado.</p>}
        </div>
      )}
    </div>
  )
}
