export default function Header() {
  return (
    <header className="bg-[#111111] text-white p-6 flex justify-between items-center">
      <h1 className="text-2xl font-bold">VORTEX CORE</h1>
      <nav className="flex gap-6">
        <a href="/">Home</a>
        <a href="/produtos">Produtos</a>
        <a href="/carrinho">Carrinho</a>
      </nav>
    </header>
  )
}