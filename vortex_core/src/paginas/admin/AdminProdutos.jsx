import { useEffect, useState } from 'react'
import { api } from '../../api'
import Campo from '../../componentes/Campo'
import Erro500 from '../../componentes/Erro500'
import { botaoClasse, botaoTealClasse, cartaoClasse, inputClasse, labelClasse } from '../../estilos'
import { centavosParaReais, formatarPreco, reaisParaCentavos } from '../../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../../utils/imagem'
import { enviarImagem } from '../../utils/uploadImagem'

const VAZIO = {
  id: null, nome: '', descricao: '', id_categoria: '', preco: '', estoque: '0', ativo: 1,
  imagens: [], // fotos que o produto já tem: { id_imagem, arquivo }
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null) // null = formulário fechado
  const [novasFotos, setNovasFotos] = useState([]) // arquivos escolhidos agora
  const [remover, setRemover] = useState([]) // ids das fotos marcadas para remover
  const [principal, setPrincipal] = useState(null) // id da foto escolhida como principal
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
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

  function abrir(produto) {
    setErro('')
    setNovasFotos([])
    setRemover([])
    setPrincipal(null)
    setForm(produto ? { ...produto, preco: centavosParaReais(produto.preco), descricao: produto.descricao || '' } : { ...VAZIO })
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const centavos = reaisParaCentavos(form.preco)
    if (Number.isNaN(centavos)) return setErro('Preço inválido. Use o formato 129,90.')

    setSalvando(true)
    try {
      // 1) as fotos novas vão direto para o Cloudinary; 2) o servidor recebe só os endereços delas
      const urls = await Promise.all(novasFotos.map(enviarImagem))
      const corpo = {
        nome: form.nome,
        descricao: form.descricao,
        id_categoria: Number(form.id_categoria),
        preco: centavos,
        estoque: Number(form.estoque),
        ativo: form.ativo,
        remover,
        principal,
        imagens_novas: urls,
      }
      await api(form.id ? `/admin/produtos/${form.id}` : '/admin/produtos', { method: form.id ? 'PUT' : 'POST', corpo })
      setForm(null)
      carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Botão rápido da lista
  async function alternarAtivo(p) {
    await api(`/admin/produtos/${p.id}`, { method: 'PATCH', corpo: { ativo: !p.ativo } }).catch(() => {})
    carregar()
  }

  function alternarRemocao(idImagem) {
    setRemover((r) => (r.includes(idImagem) ? r.filter((x) => x !== idImagem) : [...r, idImagem]))
    if (principal === idImagem) setPrincipal(null)
  }

  if (erroGeral) return <Erro500 />

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase">Produtos</h1>
        <div className="flex gap-2">
          <input value={busca} onChange={(e) => { setBusca(e.target.value); carregar(e.target.value) }} placeholder="Buscar produto" className={`${inputClasse} !w-48`} />
          <button type="button" onClick={() => abrir(null)} className={botaoClasse}>Cadastrar</button>
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

          {/* Fotos que o produto já tem */}
          {form.imagens.length > 0 && (
            <div className="sm:col-span-2">
              <span className={labelClasse}>Fotos atuais</span>
              <div className="flex flex-wrap gap-3">
                {form.imagens.map((img, i) => {
                  const marcada = remover.includes(img.id_imagem)
                  const ehPrincipal = principal ? principal === img.id_imagem : i === 0 && !marcada
                  return (
                    <div key={img.id_imagem} className={`w-24 text-center text-[11px] ${marcada ? 'opacity-40' : ''}`}>
                      <img src={urlImagem(img.arquivo)} onError={aoFalharImagem} alt="" className={`h-28 w-24 rounded border bg-neutral-900 object-contain ${ehPrincipal ? 'border-[#35dcee]' : 'border-white/20'}`} />
                      {ehPrincipal && <p className="mt-1 font-bold text-[#35dcee]">Principal</p>}
                      {!ehPrincipal && !marcada && (
                        <button type="button" onClick={() => setPrincipal(img.id_imagem)} className="mt-1 underline hover:text-[#35dcee]">Tornar principal</button>
                      )}
                      <button type="button" onClick={() => alternarRemocao(img.id_imagem)} className="block w-full underline hover:text-red-400">
                        {marcada ? 'Desfazer' : 'Remover'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <label className="block sm:col-span-2">
            <span className={labelClasse}>Adicionar fotos (JPG, PNG ou WEBP, até 3 MB cada, no máximo 8)</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setNovasFotos(Array.from(e.target.files))} className="text-xs" />
            {novasFotos.length > 0 && <p className="mt-1 text-xs text-white/60">{novasFotos.length} foto(s) escolhida(s): {novasFotos.map((f) => f.name).join(', ')}</p>}
          </label>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.ativo === 1} onChange={(e) => setForm({ ...form, ativo: e.target.checked ? 1 : 0 })} className="accent-[#35dcee]" />
            Produto ativo (visível na loja)
          </label>
          {erro && <p className="text-sm text-red-400 sm:col-span-2">{erro}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={salvando} className={botaoTealClasse}>{salvando ? 'Salvando...' : 'Salvar'}</button>
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
            <article key={p.id} className={`${cartaoClasse} flex flex-wrap items-center gap-4 !p-3 text-sm ${p.ativo ? '' : 'opacity-60'}`}>
              <img src={urlImagem(p.imagem)} onError={aoFalharImagem} alt="" className="h-14 w-12 rounded bg-neutral-900 object-contain" />
              <div className="min-w-40 flex-1">
                <p className="font-bold uppercase">{p.nome}</p>
                <p className="text-white/60">{p.categoria} · estoque {p.estoque} · {p.imagens.length} foto(s){p.ativo ? '' : ' · inativo'}</p>
              </div>
              <span className="font-bold text-[#35dcee]">{formatarPreco(p.preco)}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => abrir(p)} className="rounded border border-white/30 px-3 py-1 text-xs font-bold uppercase hover:border-[#35dcee]">Editar</button>
                <button type="button" onClick={() => alternarAtivo(p)} className="rounded border border-white/30 px-3 py-1 text-xs font-bold uppercase hover:border-[#35dcee]">
                  {p.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </article>
          ))}
          {produtos.length === 0 && <p className="py-10 text-center text-white/60">Nenhum produto encontrado.</p>}
        </div>
      )}
    </div>
  )
}
