import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser } from 'react-icons/fi'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'
import Campo from '../componentes/Campo'
import CampoSenha from '../componentes/CampoSenha'
import EnderecoForm, { ENDERECO_VAZIO } from '../componentes/EnderecoForm'
import { botaoClasse, botaoTealClasse, cartaoClasse, paginaClasse } from '../estilos'
import { formatarPreco } from '../utils/formatarPreco'
import { STATUS_PEDIDO, formatarData } from '../utils/status'

export default function Perfil() {
  const { usuario, setUsuario, sair } = useAuth()
  const navigate = useNavigate()

  const [editando, setEditando] = useState(false)
  const [dados, setDados] = useState({ nome: usuario.nome, email: usuario.email, senhaAtual: '', novaSenha: '' })
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO)
  const [pedidos, setPedidos] = useState([])
  const [msg, setMsg] = useState({ perfil: '', endereco: '', pedidos: '' })

  useEffect(() => {
    api('/endereco').then((d) => d.endereco && setEndereco({ ...ENDERECO_VAZIO, ...d.endereco })).catch(() => {})
    api('/pedidos').then((d) => setPedidos(d.pedidos)).catch(() => {})
  }, [])

  async function salvarPerfil(e) {
    e.preventDefault()
    try {
      const d = await api('/auth/me', { method: 'PUT', corpo: dados })
      setUsuario(d.usuario)
      setEditando(false)
      setMsg((m) => ({ ...m, perfil: 'Perfil atualizado!' }))
    } catch (err) {
      setMsg((m) => ({ ...m, perfil: err.message }))
    }
  }

  async function salvarEndereco(e) {
    e.preventDefault()
    try {
      await api('/endereco', { method: 'PUT', corpo: endereco })
      setMsg((m) => ({ ...m, endereco: 'Endereço salvo!' }))
    } catch (err) {
      setMsg((m) => ({ ...m, endereco: err.message }))
    }
  }

  async function pagarAgora(id) {
    try {
      const d = await api(`/pedidos/${id}/pagar`, { method: 'POST', corpo: {} })
      if (d.init_point) window.location.href = d.init_point
      else setMsg((m) => ({ ...m, pedidos: d.aviso }))
    } catch (err) {
      setMsg((m) => ({ ...m, pedidos: err.message }))
    }
  }

  function fazerLogout() {
    sair()
    navigate('/')
  }

  return (
    <div className={`${paginaClasse} px-4 py-10 md:px-8`}>
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Dados pessoais */}
        <section>
          <h1 className="text-2xl font-extrabold uppercase">Seu perfil</h1>
          <div className={`${cartaoClasse} mt-4`}>
            {!editando ? (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <FiUser className="mt-1 text-4xl text-[#35dcee]" />
                  <div className="text-sm">
                    <p className="text-lg font-extrabold uppercase">{usuario.nome}</p>
                    <p className="mt-2 text-white/60">E-mail</p>
                    <p>{usuario.email}</p>
                    <p className="mt-2 text-white/60">Senha</p>
                    <p>••••••••</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditando(true)} className={botaoClasse}>Editar perfil</button>
                  <button type="button" onClick={fazerLogout} className="rounded border border-white/30 px-4 py-2 text-sm font-bold uppercase hover:border-[#35dcee]">Sair</button>
                </div>
              </div>
            ) : (
              <form onSubmit={salvarPerfil} className="grid gap-3 sm:grid-cols-2">
                <Campo label="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required />
                <Campo label="E-mail" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} required />
                <CampoSenha label="Senha atual (só para trocar a senha)" value={dados.senhaAtual} onChange={(e) => setDados({ ...dados, senhaAtual: e.target.value })} />
                <CampoSenha label="Nova senha (opcional)" value={dados.novaSenha} onChange={(e) => setDados({ ...dados, novaSenha: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" className={botaoClasse}>Salvar</button>
                  <button type="button" onClick={() => setEditando(false)} className="rounded border border-white/30 px-4 py-2 text-sm font-bold uppercase">Cancelar</button>
                </div>
              </form>
            )}
            {msg.perfil && <p className="mt-3 text-sm text-[#35dcee]">{msg.perfil}</p>}
          </div>
        </section>

        {/* Endereço */}
        <section>
          <h2 className="text-xl font-extrabold uppercase">Endereço</h2>
          <form onSubmit={salvarEndereco} className={`${cartaoClasse} mt-4 space-y-4`}>
            <EnderecoForm valor={endereco} onChange={setEndereco} />
            <div className="flex items-center gap-4">
              <button type="submit" className={botaoTealClasse}>Salvar endereço</button>
              {msg.endereco && <span className="text-sm text-[#35dcee]">{msg.endereco}</span>}
            </div>
          </form>
        </section>

        {/* Pedidos */}
        <section>
          <h2 className="text-xl font-extrabold uppercase">Meus pedidos</h2>
          {msg.pedidos && <p className="mt-2 text-sm text-[#35dcee]">{msg.pedidos}</p>}
          {pedidos.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">Você ainda não fez nenhum pedido.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pedidos.map((p) => (
                <article key={p.id_pedido} className={`${cartaoClasse} text-sm`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">Pedido #{p.id_pedido} · {formatarData(p.data_pedido)}</p>
                    <span className="rounded bg-[#35dcee]/20 px-2 py-0.5 text-xs font-bold text-[#35dcee]">{STATUS_PEDIDO[p.status]}</span>
                  </div>
                  <ul className="mt-2 text-white/80">
                    {p.itens.map((i) => (
                      <li key={i.id_produto}>{i.quantidade}x {i.nome}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-bold">Total: {formatarPreco(p.total)}</p>
                  {p.codigo_rastreio && <p className="text-white/70">Rastreio: {p.codigo_rastreio}</p>}
                  {p.status === 'aguardando_pagamento' && (
                    <button type="button" onClick={() => pagarAgora(p.id_pedido)} className={`${botaoClasse} mt-3`}>Pagar agora</button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
