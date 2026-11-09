import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface DialogoCancelarProps {
  /** Id do chamado a cancelar; null fecha o diálogo. */
  idChamado: string | null
  aoConfirmar: () => void
  aoVoltar: () => void
  /** Ao fechar: devolve o foco a quem abriu (o diálogo abre por código, sem DialogTrigger). */
  aoDevolverFoco?: (evento: Event) => void
}

/** Confirmação antes de cancelar um chamado (status final, sem volta). Foco inicial em "Voltar". */
export function DialogoCancelar({ idChamado, aoConfirmar, aoVoltar, aoDevolverFoco }: DialogoCancelarProps) {
  const voltar = useRef<HTMLButtonElement>(null)
  // Guarda o último id para o texto não sumir durante a animação de saída.
  const [ultimoId, setUltimoId] = useState(idChamado)
  if (idChamado && idChamado !== ultimoId) setUltimoId(idChamado)
  const id = idChamado ?? ultimoId

  return (
    <Dialog open={idChamado !== null} onOpenChange={(aberto) => !aberto && aoVoltar()}>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        onOpenAutoFocus={(evento) => {
          evento.preventDefault()
          voltar.current?.focus()
        }}
        onCloseAutoFocus={aoDevolverFoco}
      >
        <DialogHeader>
          <DialogTitle>Cancelar chamado {id}?</DialogTitle>
          <DialogDescription>
            Cancelado é um status final: o chamado não pode ser reaberto. Se a luminária continuar com falha, o robô
            abre um chamado novo para a placa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button ref={voltar} type="button" variant="outline" onClick={aoVoltar}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={aoConfirmar}>
            Cancelar chamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
