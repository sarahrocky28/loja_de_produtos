import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { FiTruck, FiCreditCard, FiZap } from 'react-icons/fi'
import { FaDumbbell, FaPrescriptionBottle, FaTshirt, FaStar } from 'react-icons/fa'
import CardProduto from '../componentes/CardProduto'
import { FRETE_GRATIS_ACIMA } from '../config'

const beneficios = [
  { Icone: FiTruck, titulo: 'Frete grátis', texto: `Acima de ${FRETE_GRATIS_ACIMA}` },
  { Icone: FiCreditCard, titulo: 'Até 6x no cartão', texto: 'Acima de R$ 50,00' },
  { Icone: FiZap, titulo: 'Identidade Vortex', texto: 'Em cada detalhe' },
]

const focos = [
  { nome: 'Acessórios', Icone: FaDumbbell, to: '/produtos?categoria=acessorios' },
  { nome: 'Suplementos', Icone: FaPrescriptionBottle, to: '/produtos?categoria=suplementos' },
  { nome: 'Roupas', Icone: FaTshirt, to: '/produtos?categoria=roupas' },
]

const avaliacoes = [
  { nome: 'Lucyle2013', data: '29/10', nota: 5, texto: 'Muito bom, ótimo produto, gostei e vou fazer outro pedido. Entrega rápida e chegou em perfeito estado.' },
  { nome: 'RichardLife', data: '22/10', nota: 5, texto: 'Bom custo-benefício. Comprei dois, mais perto e de qualidade. Pretendo continuar comprando.' },
  { nome: 'Leanine_ester', data: '05/11', nota: 5, texto: 'Simplesmente fantástico! Bem saboroso e chega com rapidez. Aprovadíssimo!' },
]

function Titulo({ children, className = '' }) {
  return (
    <h2 className={`text-center text-xl font-extrabold uppercase tracking-wide md:text-3xl ${className}`}>
      {children}
    </h2>
  )
}

export default function Home() {
  const [produtosDestaque, setProdutosDestaque] = useState([])

  useEffect(() => {
    api('/produtos?limite=4')
      .then((d) => setProdutosDestaque(d.produtos))
      .catch(() => setProdutosDestaque([]))
  }, [])

  return (
    <div className="bg-black text-white">
      
      <section className="bg-black">
        <img
          src="/hero.png"
          alt="Vortex Core - Whey Protein"
          className="mx-auto w-full max-w-7xl object-cover"
        />
      </section>

      
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <Titulo>
          Conheça os melhores do <span className="text-[#35dcee]">momento</span>
        </Titulo>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {produtosDestaque.map((p) => (
            <CardProduto key={p.id} produto={p} />
          ))}
        </div>
      </section>

      
      <section className="border-y border-white/10 px-4 py-8">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {beneficios.map(({ Icone, titulo, texto }) => (
            <li key={titulo} className="flex items-center justify-center gap-3">
              <Icone className="text-3xl text-[#35dcee]" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold uppercase">{titulo}</p>
                <p className="text-xs text-white/70">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      
      <section
        className="relative bg-neutral-900 bg-cover bg-center"
        style={{ backgroundImage: "url('/academia.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-sm text-white/80">Escolha o seu foco</p>
          <h2 className="mt-1 text-2xl font-extrabold uppercase md:text-4xl">
            Feito para o seu <span className="text-[#35dcee]">treino.</span>
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {focos.map(({ nome, Icone, to }) => (
              <Link
                key={nome}
                to={to}
                className="flex items-center justify-center gap-3 rounded border border-white/20 bg-black/70 px-4 py-4 text-sm font-bold transition hover:border-[#35dcee] hover:text-[#35dcee]"
              >
                <Icone className="text-xl" aria-hidden="true" />
                {nome}
              </Link>
            ))}
          </div>
        </div>
      </section>

      
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <Titulo>O que os clientes dizem</Titulo>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {avaliacoes.map((a) => (
            <article key={a.nome} className="rounded border border-white/15 bg-[#0d0d0d] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">{a.nome}</span>
                <span className="text-white/60">{a.data}</span>
              </div>
              <div className="mt-2 flex gap-1 text-[#f5c518]" aria-label={`${a.nota} de 5 estrelas`}>
                {Array.from({ length: a.nota }).map((_, i) => (
                  <FaStar key={i} />
                ))}
              </div>
              <p className="mt-3 text-sm text-white/80">{a.texto}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
