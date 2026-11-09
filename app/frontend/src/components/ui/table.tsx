import * as React from "react"
import { cn } from "@/lib/utils"

/** true quando o conteúdo passa da largura do contêiner (há rolagem horizontal). */
function useRolaNaHorizontal(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [rola, setRola] = React.useState(false)
  React.useLayoutEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const medir = () => setRola(elemento.scrollWidth > elemento.clientWidth + 1)
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    const tabela = elemento.firstElementChild
    if (tabela) observador.observe(tabela)
    return () => observador.disconnect()
  }, [ref])
  return rola
}

/**
 * Tabela dentro de um contêiner que rola na horizontal. `rotulo` dá nome à região (`role="region"`),
 * para o leitor de tela e para quem chega nela pelo Tab: quando a tabela não cabe, o contêiner entra na
 * ordem do Tab (as setas rolam) com anel de foco visível.
 */
function Table({ className, rotulo, ...props }: React.ComponentProps<"table"> & { rotulo?: string }) {
  const caixa = React.useRef<HTMLDivElement>(null)
  const rola = useRolaNaHorizontal(caixa)
  return (
    <div
      ref={caixa}
      data-slot="table-container"
      role={rotulo ? "region" : undefined}
      aria-label={rotulo}
      tabIndex={rola ? 0 : undefined}
      className="relative w-full overflow-x-auto outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
