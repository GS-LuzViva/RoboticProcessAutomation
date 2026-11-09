/**
 * Tema claro/escuro/sistema. A preferência fica no localStorage (com try/catch: modo privado ou
 * armazenamento bloqueado não quebram nada). `aplicarTema` é chamado no main.tsx antes do primeiro
 * render, então não há clarão de tema errado.
 */

export type PreferenciaTema = "claro" | "escuro" | "sistema"
export type TemaEfetivo = "claro" | "escuro"

const CHAVE = "luzviva-tema"
const CONSULTA_ESCURO = "(prefers-color-scheme: dark)"

/** Cor da barra do navegador = cor da barra superior (a barra lateral escura) em cada tema. */
const COR_BARRA: Record<TemaEfetivo, string> = { claro: "#1B2430", escuro: "#0D141C" }

export function lerPreferencia(): PreferenciaTema {
  try {
    const valor = window.localStorage.getItem(CHAVE)
    if (valor === "claro" || valor === "escuro" || valor === "sistema") return valor
  } catch {
    // armazenamento indisponível: segue o sistema
  }
  return "sistema"
}

export function salvarPreferencia(preferencia: PreferenciaTema): void {
  try {
    if (preferencia === "sistema") window.localStorage.removeItem(CHAVE)
    else window.localStorage.setItem(CHAVE, preferencia)
  } catch {
    // sem persistência; o tema vale só nesta visita
  }
}

export function sistemaEscuro(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(CONSULTA_ESCURO).matches
}

export function resolverTema(preferencia: PreferenciaTema): TemaEfetivo {
  if (preferencia === "sistema") return sistemaEscuro() ? "escuro" : "claro"
  return preferencia
}

/** Põe `.light` ou `.dark` no <html>, ajusta `color-scheme` e as metas `theme-color`. */
export function aplicarTema(tema: TemaEfetivo): void {
  const raiz = document.documentElement
  raiz.classList.toggle("dark", tema === "escuro")
  raiz.classList.toggle("light", tema === "claro")
  raiz.style.colorScheme = tema === "escuro" ? "dark" : "light"
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = COR_BARRA[tema]
  }
}

/** Assina mudanças do tema do sistema. Devolve a função que cancela a assinatura. */
export function observarSistema(aoMudar: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {}
  const consulta = window.matchMedia(CONSULTA_ESCURO)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}
