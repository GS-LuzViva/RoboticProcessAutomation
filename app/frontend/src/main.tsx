import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { aplicarTema, lerPreferencia, resolverTema } from "@/lib/tema"

// Antes do primeiro render: põe .light/.dark no <html> para não piscar o tema errado.
aplicarTema(resolverTema(lerPreferencia()))

const raiz = document.getElementById("root")
if (!raiz) throw new Error("Elemento #root não encontrado no index.html")

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
