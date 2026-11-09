import { lazy, useState } from "react"
import { HashRouter, Link, Route, Routes } from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"

import { AppShell } from "@/components/layout/AppShell"
import { PageHeader } from "@/components/layout/PageHeader"
import { GestorKeyProvider } from "@/components/luzviva/GestorKeyProvider"
import { ProvedorTema } from "@/components/tema/ProvedorTema"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import { criarClienteConsulta } from "@/lib/consulta"

// Cada tela é um pedaço separado do bundle, baixado só quando a pessoa abre a tela.
const Mapa = lazy(() => import("@/pages/Mapa"))
const Fila = lazy(() => import("@/pages/Fila"))
const Chamados = lazy(() => import("@/pages/Chamados"))
const Painel = lazy(() => import("@/pages/Painel"))
const Relatar = lazy(() => import("@/pages/Relatar"))
const Assistente = lazy(() => import("@/pages/Assistente"))

function NaoEncontrada() {
  return (
    <>
      <PageHeader titulo="Página não encontrada" descricao="O endereço não corresponde a nenhuma tela do LuzViva." />
      <Button asChild className="w-fit">
        <Link to="/">Abrir o mapa</Link>
      </Button>
    </>
  )
}

export default function App() {
  const [clienteConsulta] = useState(criarClienteConsulta)
  return (
    <ProvedorTema>
      <QueryClientProvider client={clienteConsulta}>
        <GestorKeyProvider>
          <TooltipProvider delayDuration={300}>
            {/* HashRouter: o FastAPI serve static/ sem fallback de SPA, então a rota vive no "#". */}
            <HashRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Mapa />} />
                  <Route path="fila" element={<Fila />} />
                  <Route path="chamados" element={<Chamados />} />
                  <Route path="painel" element={<Painel />} />
                  <Route path="relatar" element={<Relatar />} />
                  <Route path="assistente" element={<Assistente />} />
                  <Route path="*" element={<NaoEncontrada />} />
                </Route>
              </Routes>
            </HashRouter>
            <Avisos />
          </TooltipProvider>
        </GestorKeyProvider>
      </QueryClientProvider>
    </ProvedorTema>
  )
}

/** No celular os botões principais ficam embaixo e em largura total; o aviso vai para o topo. */
function Avisos() {
  const celular = useIsMobile()
  return <Toaster position={celular ? "top-center" : "bottom-right"} />
}
