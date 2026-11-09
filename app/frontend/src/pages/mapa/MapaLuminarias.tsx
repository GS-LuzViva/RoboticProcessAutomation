import "leaflet/dist/leaflet.css"
import "./mapa.css"

import { useEffect, useMemo, useRef, type Ref, type RefObject } from "react"
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet"
import { latLngBounds, type LeafletEvent, type Map as MapaLeaflet, type Popup as PopupLeaflet } from "leaflet"

import { BORDA_MAPA, CORES_MAPA } from "@/lib/dominio"
import type { Area, Situacao } from "@/lib/tipos"

import { RAIO_SITUACAO, useTelaEstreita } from "./estilo"
import { ATRIBUTO_FOCO_POPUP, PopupPoste } from "./PopupPoste"
import type { Poste } from "./postes"

/** Centro de São Paulo, só até os pontos da área chegarem. */
const CENTRO_INICIAL: [number, number] = [-23.55, -46.63]

/** Zoom ao abrir um poste (pela lista ou por link). */
export const ZOOM_FOCO = 18

/** Folga entre o popup e a borda do mapa (ou o controle de zoom), em px. */
const FOLGA_POPUP = 12

/** Tempo sem movimento para considerar o mapa parado (fim do zoom, do autoPan e do popup). */
const ESPERA_MAPA_PARADO_MS = 120

/** Altura mínima do conteúdo do popup quando ele precisa rolar por dentro, em px. */
const ALTURA_MINIMA_POPUP = 120

const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/**
 * Pedido para centralizar o mapa num poste e deixar o popup dele inteiro à vista. `seq` muda a
 * cada pedido (escolher o mesmo poste de novo também conta). Com `moverFoco`, o foco vai para o
 * título do popup quando ele termina de aparecer (celular: a lista em folha acabou de fechar).
 */
export interface PedidoFoco {
  poste: Poste
  moverFoco: boolean
  seq: number
}

export interface MapaLuminariasProps {
  area: Area
  /** Postes já na ordem de desenho (falhas por último, por cima). */
  postes: readonly Poste[]
  visiveis: ReadonlySet<Situacao>
  selecionado: Poste | null
  /** Poste pedido por link: o mapa abre aproximado nele. */
  focoInicial: Poste | null
  /** Último pedido de foco (lista de falhas ou clique num círculo). */
  pedidoFoco: PedidoFoco | null
  aoSelecionar: (poste: Poste) => void
  /** Fecha o popup do poste `id` (ou qualquer um, com `null`). */
  aoFechar: (id: string | null) => void
  rotulo: string
  movimentoReduzido: boolean
  mapaRef: Ref<MapaLeaflet>
}

/**
 * Enquadra os pontos da área quando a área muda (não a cada nova busca da mesma área). Com um
 * poste pedido por link (`foco`), aproxima direto nele em vez de enquadrar a área.
 */
function Enquadrar({ area, postes, foco, animar }: { area: Area; postes: readonly Poste[]; foco: Poste | null; animar: boolean }) {
  const mapa = useMap()
  const enquadrada = useRef<Area | null>(null)
  const focoAplicado = useRef<string | null>(null)
  useEffect(() => {
    if (!foco || focoAplicado.current === foco.id) return
    focoAplicado.current = foco.id
    enquadrada.current = area
    mapa.invalidateSize()
    mapa.setView([foco.lat, foco.lon], ZOOM_FOCO, { animate: false })
  }, [mapa, area, foco])
  useEffect(() => {
    if (postes.length === 0 || enquadrada.current === area) return
    enquadrada.current = area
    const limites = latLngBounds(postes.map((p) => [p.lat, p.lon] as [number, number]))
    mapa.invalidateSize()
    mapa.fitBounds(limites, { padding: [24, 24], maxZoom: 17, animate: animar })
  }, [mapa, area, postes, animar])
  return null
}

/**
 * Quanto deslocar o mapa (px) para o popup caber inteiro, sem ficar sob o controle de zoom.
 * Se o popup for mais alto que o mapa, o topo (placa, endereço, situação) é o que fica à vista.
 */
function deslocamentoParaCaber(mapa: MapaLeaflet, popup: HTMLElement): [number, number] {
  const caixa = mapa.getContainer().getBoundingClientRect()
  const alvo = popup.getBoundingClientRect()
  let topo = caixa.top + FOLGA_POPUP
  const zoom = mapa.getContainer().querySelector(".leaflet-control-zoom")?.getBoundingClientRect()
  const abaixoDoZoom = zoom ? zoom.bottom + FOLGA_POPUP / 2 : topo
  // Abaixo do controle de zoom só se o popup couber ali inteiro (mapa baixo: 320 × 568).
  const cabeAbaixoDoZoom = caixa.bottom - FOLGA_POPUP - abaixoDoZoom >= alvo.height
  if (zoom && zoom.right > alvo.left && zoom.left < alvo.right && cabeAbaixoDoZoom) topo = abaixoDoZoom

  let dx = 0
  let dy = 0
  if (alvo.right > caixa.right - FOLGA_POPUP) dx = alvo.right - (caixa.right - FOLGA_POPUP)
  if (alvo.left - dx < caixa.left + FOLGA_POPUP) dx = alvo.left - (caixa.left + FOLGA_POPUP)
  if (alvo.bottom > caixa.bottom - FOLGA_POPUP) dy = alvo.bottom - (caixa.bottom - FOLGA_POPUP)
  if (alvo.top - dy < topo) dy = alvo.top - topo
  return [Math.round(dx), Math.round(dy)]
}

/**
 * Atende o pedido de foco: centraliza no poste e, quando o mapa para, desloca o necessário para o
 * popup caber inteiro (o autoPan do Leaflet roda na abertura, antes do zoom terminar, e deixava o
 * topo do popup cortado). Com `moverFoco`, leva o foco ao título do popup.
 */
function FocarPoste({
  pedido,
  animar,
  popupRef,
}: {
  pedido: PedidoFoco | null
  animar: boolean
  popupRef: RefObject<PopupLeaflet | null>
}) {
  const mapa = useMap()
  const animarRef = useRef(animar)
  useEffect(() => {
    animarRef.current = animar
  }, [animar])

  useEffect(() => {
    if (!pedido) return
    let ativo = true
    const animacao = animarRef.current
    const { poste, moverFoco } = pedido

    const focarNoPopup = () => {
      if (!ativo || !moverFoco) return
      mapa
        .getContainer()
        .querySelector<HTMLElement>(`.leaflet-popup [${ATRIBUTO_FOCO_POPUP}]`)
        ?.focus({ preventScroll: true })
    }
    // O mapa só é medido parado: o popup abre com o autoPan dele (que termina com um moveend no
    // meio do zoom) e o conteúdo do popup (portal do React) chega um quadro depois. Cada início de
    // movimento desarma a espera; cada fim a arma de novo.
    let espera = 0
    const desarmar = () => window.clearTimeout(espera)
    const armar = () => {
      desarmar()
      espera = window.setTimeout(enquadrarPopup, ESPERA_MAPA_PARADO_MS)
    }
    const soltar = () => {
      desarmar()
      mapa.off("movestart zoomstart", desarmar)
      mapa.off("moveend", armar)
    }

    function enquadrarPopup() {
      soltar()
      if (!ativo) return
      const popup = mapa.getContainer().querySelector<HTMLElement>(".leaflet-popup")
      if (!popup) return
      // Popup mais alto que o mapa (celular deitado): limita a altura e o conteúdo rola por dentro.
      const conteudo = popup.querySelector<HTMLElement>(".leaflet-popup-content")
      const sobra = popup.getBoundingClientRect().height + 2 * FOLGA_POPUP - mapa.getContainer().clientHeight
      const instancia = popupRef.current
      if (sobra > 0 && conteudo && instancia) {
        instancia.options.maxHeight = Math.max(ALTURA_MINIMA_POPUP, conteudo.offsetHeight - sobra)
        instancia.update()
      }
      const [dx, dy] = deslocamentoParaCaber(mapa, popup)
      if (dx !== 0 || dy !== 0) mapa.panBy([dx, dy], { animate: animacao })
      focarNoPopup()
    }

    mapa.on("movestart zoomstart", desarmar)
    mapa.on("moveend", armar)
    mapa.stop()
    mapa.invalidateSize({ pan: false })
    mapa.setView([poste.lat, poste.lon], Math.max(mapa.getZoom(), ZOOM_FOCO), { animate: animacao })
    armar() // se nada se mexer (já estava ali), mede assim mesmo
    return () => {
      ativo = false
      soltar()
    }
  }, [mapa, pedido, popupRef])
  return null
}

/** Põe nome e papel acessíveis no contêiner do Leaflet (que já recebe foco e aceita as setas). */
function RotuloAcessivel({ rotulo }: { rotulo: string }) {
  const mapa = useMap()
  useEffect(() => {
    const el = mapa.getContainer()
    el.setAttribute("role", "region")
    el.setAttribute("aria-roledescription", "mapa")
    el.setAttribute("aria-label", rotulo)
  }, [mapa, rotulo])
  return null
}

/** Clique no mapa vazio fecha o popup (o clique num círculo não chega aqui). */
function FecharAoClicar({ aoFechar }: { aoFechar: (id: string | null) => void }) {
  useMapEvents({ click: () => aoFechar(null) })
  return null
}

/**
 * O foco estava no popup (X, título ou botões) e sumiu com ele: volta para o mapa, em vez de cair
 * no início da página.
 */
function FocoAoFecharPopup() {
  const mapa = useMap()
  useMapEvents({
    // Marca o mapa com popup aberto (no celular o controle de zoom sai da frente: mapa.css).
    popupopen: () => mapa.getContainer().classList.add("com-popup"),
    popupclose: (evento) => {
      mapa.getContainer().classList.remove("com-popup")
      // Com animação o Leaflet só tira o popup do DOM 200 ms depois: confere se o foco está nele.
      const ativo = document.activeElement
      if (!ativo || ativo === document.body || evento.popup.getElement()?.contains(ativo)) {
        mapa.getContainer().focus({ preventScroll: true })
      }
    },
  })
  return null
}

/** O Leaflet escreve "Close popup" no X do popup: troca por "Fechar". */
function traduzirFechar(evento: LeafletEvent) {
  const botao = (evento.target as PopupLeaflet).getElement()?.querySelector(".leaflet-popup-close-button")
  botao?.setAttribute("aria-label", "Fechar")
  botao?.setAttribute("title", "Fechar")
}

export function MapaLuminarias({
  area,
  postes,
  visiveis,
  selecionado,
  focoInicial,
  pedidoFoco,
  aoSelecionar,
  aoFechar,
  rotulo,
  movimentoReduzido,
  mapaRef,
}: MapaLuminariasProps) {
  const desenhados = useMemo(() => postes.filter((p) => visiveis.has(p.situacao)), [postes, visiveis])
  const selecionadoId = selecionado?.id ?? null
  const estreita = useTelaEstreita()
  const popupRef = useRef<PopupLeaflet>(null)

  return (
    <MapContainer
      ref={mapaRef}
      center={CENTRO_INICIAL}
      zoom={14}
      preferCanvas
      zoomControl={false}
      closePopupOnClick={false}
      zoomAnimation={!movimentoReduzido}
      fadeAnimation={!movimentoReduzido}
      markerZoomAnimation={!movimentoReduzido}
      inertia={!movimentoReduzido}
      className="mapa-luzviva absolute inset-0 isolate rounded-xl"
    >
      <ZoomControl position="topleft" zoomInTitle="Aproximar" zoomOutTitle="Afastar" />
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution={ATRIBUICAO} />
      <Enquadrar area={area} postes={postes} foco={focoInicial} animar={!movimentoReduzido} />
      <RotuloAcessivel rotulo={rotulo} />
      <FecharAoClicar aoFechar={aoFechar} />
      {desenhados.map((poste) => {
        const ativo = poste.id === selecionadoId
        return (
          <CircleMarker
            key={poste.id}
            center={[poste.lat, poste.lon]}
            radius={RAIO_SITUACAO[poste.situacao] + (ativo ? 3 : 0)}
            pathOptions={{
              fillColor: CORES_MAPA[poste.situacao],
              fillOpacity: 0.92,
              color: BORDA_MAPA.color,
              weight: ativo ? 3 : BORDA_MAPA.weight,
            }}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => aoSelecionar(poste) }}
          />
        )
      })}
      {selecionado && visiveis.has(selecionado.situacao) && (
        <Popup
          ref={popupRef}
          key={selecionado.id}
          position={[selecionado.lat, selecionado.lon]}
          offset={[0, -(RAIO_SITUACAO[selecionado.situacao] + 2)]}
          // Em 320 px o mapa tem ~286 px: o popup estreita para caber inteiro.
          minWidth={estreita ? 224 : 256}
          maxWidth={estreita ? 232 : 300}
          autoPanPadding={[16, 16]}
          eventHandlers={{
            add: traduzirFechar,
            // Fechou pelo X ou pelo Esc: limpa a seleção (se ainda for este poste).
            remove: () => aoFechar(selecionado.id),
          }}
        >
          <PopupPoste poste={selecionado} area={area} />
        </Popup>
      )}
      <FocarPoste pedido={pedidoFoco} animar={!movimentoReduzido} popupRef={popupRef} />
      <FocoAoFecharPopup />
    </MapContainer>
  )
}
