import { NavLink, useLocation, useSearchParams } from "react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { PARAMETRO_AREA } from "@/hooks/use-area-param"

import { AlternarTema } from "./AlternarTema"
import { RodapeProjeto } from "./Equipe"
import { MarcaLuzViva } from "./MarcaLuzViva"
import { NAVEGACAO } from "./navegacao"

/** Barra lateral escura (a "noite" em volta da área de trabalho). No celular vira Sheet. */
export function BarraLateral() {
  const { setOpenMobile } = useSidebar()
  const [parametros] = useSearchParams()
  const area = parametros.get(PARAMETRO_AREA)
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      {/* Tudo da barra (marca, telas, tema e rodapé) dentro de um marco; o <nav> fica dentro dele. */}
      <aside aria-label="Menu do LuzViva" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader className="px-4 pt-5 pb-4">
          <NavLink
            to={{ pathname: "/", search: area ? `?${PARAMETRO_AREA}=${encodeURIComponent(area)}` : "" }}
            onClick={() => setOpenMobile(false)}
            className="rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-sidebar-ring"
            aria-label="LuzViva, ir para o mapa"
          >
            <MarcaLuzViva />
          </NavLink>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <nav aria-label="Telas do LuzViva">
              <SidebarMenu className="gap-1">
                {NAVEGACAO.map(({ caminho, rotulo, icone: Icone, usaArea }) => (
                  <SidebarMenuItem key={caminho}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === caminho}
                      className="relative font-semibold text-sidebar-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full data-active:font-bold data-active:before:bg-sidebar-primary"
                    >
                      {/* NavLink põe aria-current="page" na tela atual. */}
                      <NavLink
                        end
                        to={{
                          pathname: caminho,
                          search: usaArea && area ? `?${PARAMETRO_AREA}=${encodeURIComponent(area)}` : "",
                        }}
                        onClick={() => setOpenMobile(false)}
                      >
                        <Icone aria-hidden="true" />
                        <span>{rotulo}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 pb-4">
          <AlternarTema />
          <SidebarSeparator className="mx-2" />
          <RodapeProjeto />
        </SidebarFooter>
      </aside>
    </Sidebar>
  )
}
