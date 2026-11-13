// Envia uma foto direto do navegador para o Cloudinary (sem passar pelo nosso servidor)
// e devolve o endereço https da imagem. Precisa das variáveis do front:
//   VITE_CLOUDINARY_CLOUD_NAME  e  VITE_CLOUDINARY_UPLOAD_PRESET
const NUVEM = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

export async function enviarImagem(arquivo) {
  if (!NUVEM || !PRESET) {
    throw new Error('O envio de fotos ainda não foi configurado (veja o VITE_CLOUDINARY_* no .env do front).')
  }
  if (!TIPOS.includes(arquivo.type)) throw new Error(`"${arquivo.name}" não é JPG, PNG ou WEBP.`)
  if (arquivo.size > 3 * 1024 * 1024) throw new Error(`"${arquivo.name}" passa de 3 MB.`)

  const dados = new FormData()
  dados.append('file', arquivo)
  dados.append('upload_preset', PRESET)

  const resposta = await fetch(`https://api.cloudinary.com/v1_1/${NUVEM}/image/upload`, { method: 'POST', body: dados })
  const json = await resposta.json().catch(() => ({}))
  if (!resposta.ok || !json.secure_url) {
    throw new Error(json?.error?.message || `Não foi possível enviar "${arquivo.name}".`)
  }
  return json.secure_url
}
