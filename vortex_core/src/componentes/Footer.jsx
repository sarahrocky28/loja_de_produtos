import { Link } from 'react-router-dom'
import { FaWhatsapp, FaInstagram, FaLinkedinIn } from 'react-icons/fa'

const redes = [
  { nome: 'WhatsApp', href: 'https://wa.me/5500000000000', Icone: FaWhatsapp },
  { nome: 'Instagram', href: 'https://instagram.com/', Icone: FaInstagram },
  { nome: 'LinkedIn', href: 'https://linkedin.com/', Icone: FaLinkedinIn },
]

const colunas = [
  {
    titulo: 'Ajuda e políticas',
    itens: [
      { label: 'Política de privacidade' },
      { label: 'Termos de uso' },
      { label: 'Trocas e devoluções' },
      { label: 'Prazos de entrega' },
    ],
  },
  {
    titulo: 'Institucional',
    itens: [
      { label: 'Início', to: '/' },
      { label: 'Categorias', to: '/categorias' },
      { label: 'Contato', to: '/contato' },
    ],
  },
  {
    titulo: 'Telefone',
    itens: [{ label: '(00) 0000-0000' }, { label: 'contato@vortexcore.com' }],
  },
  {
    titulo: 'Formas de pagamento',
    itens: [{ label: 'Pix' }, { label: 'Cartão de crédito' }, { label: 'Boleto' }],
  },
  {
    titulo: 'Endereço',
    itens: [{ label: 'Rua Exemplo, 123 - Centro' }, { label: 'Cidade - UF' }],
  },
  {
    titulo: 'Horário de atendimento',
    itens: [{ label: 'Segunda a sexta' }, { label: '9h às 18h' }],
  },
  {
    titulo: 'Trabalhe conosco',
    itens: [{ label: 'Envie seu currículo' }],
  },
]

export default function Footer() {
  return (
    <footer>
      <section className="bg-[#1a1a1a] px-4 py-10 text-center text-white">
        <h2 className="text-lg font-bold uppercase tracking-wide md:text-xl">
          Siga a Vortex nas redes sociais
        </h2>
        <div className="mt-6 flex items-center justify-center gap-8 text-4xl">
          {redes.map(({ nome, href, Icone }) => (
            <a
              key={nome}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={nome}
              className="text-[#35dcee] transition-transform hover:scale-110 hover:brightness-125"
            >
              <Icone />
            </a>
          ))}
        </div>
      </section>

      <section className="bg-[#2a909b] px-4 py-10 text-white md:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {colunas.map((col) => (
            <div key={col.titulo}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">
                {col.titulo}
              </h3>
              <ul className="space-y-1 text-sm text-white/85">
                {col.itens.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link to={item.to} className="hover:underline">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-[#2a909b] border-t border-white/20 px-4 py-4 text-center text-xs text-white/80">
        © {new Date().getFullYear()} Vortex Core · O centro da sua evolução
      </div>
    </footer>
  )
}
