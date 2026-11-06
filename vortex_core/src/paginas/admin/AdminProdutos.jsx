import { useEffect, useState } from 'react'
import { api } from '../../api'
import Campo from '../../componentes/Campo'
import Erro500 from '../../componentes/Erro500'
import { botaoClasse, botaoTealClasse, cartaoClasse, inputClasse, labelClasse } from '../../estilos'
import { centavosParaReais, formatarPreco, reaisParaCentavos } from '../../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../../utils/imagem'

const VAZIO = { id: null, nome: '', descricao: '', id_categoria: '', preco: '', estoque: '0', ativo: 1, imagem: null }

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null) // null = formulário fechado
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [erroGeral, setErroGeral] = useState(false)

  function carregar(termo = busca) {
    api(`/admin/produtos?busca=${encodeURIComponent(termo)}`)
      .then((d) => setProdutos(d.produtos))
      .catch(() => setErroGeral(true))
  }
  useEffect(() => {
    carregar('')
    api('/admin/categorias').then((d) => setCategorias(d.categorias)).catch(() => {})
  }, [])

  function abrirEdicao(p) {
    setErro('')
    setArquivo(null)
    setForm({ ...p, preco: centavosParaReais(p.preco), descricao: p.descricao || '' })
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const centavos = reaisParaCentavos(form.preco)
    if (Number.isNaN(centavos)) return setErro('Preço inválido. Use o formato 129,90.')

    const fd = new FormData()
    fd.append('nome', form.nome)
    fd.append('descricao', form.descricao)
    fd.append('id_categoria', form.id_categoria)
    fd.append('preco', centavos)
    fd.append('estoque', form.estoque)
    fd.append('ativo', form.ativo)
    if (arquivo) fd.append('imagem', arquivo)

    try {
      await api(form.id ? `/admin/produtos/${form.id}` : '/admin/produtos', { method: form.id ? 'PUT' : 'POST', formData: fd })
      setForm(null)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  if (erroGeral) return <Erro500 />

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase">Produtos</h1>
        <div className="flex gap-2">
          <input value={busca} onChange={(e) => { setBusca(e.target.value); carregar(e.target.value) }} placeholder="Buscar produto" className={`${inputClasse} !w-48`} />
          <button type="button" onClick={() => { setErro(''); setArquivo(null); setForm({ ...VAZIO }) }} className={botaoClasse}>Cadastrar</button>
        </div>
      </div>

      {form && (
        <form onSubmit={salvar} className={`${cartaoClasse} mt-6 grid gap-3 sm:grid-cols-2`}>
          <h2 className="font-bold sm:col-span-2">{form.id ? 'Editar produto' : 'Novo produto'}</h2>
          <Campo label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <label className="block">
            <span className={labelClasse}>Categoria</span>
            <select value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: e.target.value })} className={`${inputClasse} bg-black`} required>
              <option value="">Escolha...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <Campo label="Preço (R$)" inputMode="decimal" placeholder="129,90" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} required />
          <Campo label="Estoque" type="number" min="0" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} required />
          <label className="block sm:col-span-2">
            <span className={labelClasse}>Descrição</span>
            <textarea rows={3} className={inputClasse} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </label>
          <label className="block">
            <span className={labelClasse}>Imagem (JPG, PNG ou WEBP, até 3 MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setArquivo(e.target.files[0] || null)} className="text-xs" />
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" checked={form.ativo === 1} onChange={(e) => setForm({ ...form, ativo: e.target.checked ? 1 : 0 })} className="accent-[#35dcee]" />
            Produto ativo (visível na loja)
          </label>
          {erro && <p className="text-sm text-red-400 sm:col-span-2">{erro}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={botaoTealClasse}>Salvar</button>
            <button type="button" onClick={() => setForm(null)} className="rounded border border-white/30 px-4 py-2 text-sm font-bold uppercase">Cancelar</button>
          </div>
        </form>
      )}

      <h2 className="mt-10 text-center text-sm font-bold uppercase tracking-wide text-white/70">Produtos cadastrados</h2>
      {!produtos ? (
        <p className="py-10 text-center text-white/70">Carregando...</p>
      ) : (
        <div className="mt-4 space-y-2">
          {produtos.map((p) => (
            <article key={p.id} className={`${cartaoClasse} flex items-center gap-4 !p-3 text-sm ${p.ativo ? '' : 'opacity-50'}`}>
              <img src={urlImagem(p.imagem)} onError={aoFalharImagem} alt="" className="h-14 w-12 rounded bg-neutral-900 object-contain" />
              <div className="flex-1">
                <p className="font-bold uppercase">{p.nome}</p>
                <p className="text-white/60">{p.categoria} · estoque {p.estoque}{p.ativo ? '' : ' · inativo'}</p>
              </div>
              <span className="font-bold text-[#35dcee]">{formatarPreco(p.preco)}</span>
              <button type="button" onClick={() => abrirEdicao(p)} className="rounded border border-white/30 px-3 py-1 text-xs font-bold uppercase hover:border-[#35dcee]">Editar</button>
            </article>
          ))}
          {produtos.length === 0 && <p className="py-10 text-center text-white/60">Nenhum produto encontrado.</p>}
        </div>
      )}
    </div>
  )
}
