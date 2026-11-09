import { Skeleton } from "@/components/ui/skeleton"

/** Enquanto o código da tela chega (React.lazy). */
export function CarregandoTela() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Carregando a tela…</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton aria-hidden="true" className="h-80 w-full rounded-xl" />
    </div>
  )
}
