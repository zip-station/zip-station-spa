import { Building2 } from 'lucide-react'

export function CompaniesPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Companies</h2>
        <p className="mt-1 text-muted-foreground">
          Manage your organizations.
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Companies</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your company was created during setup. Company management coming soon.
        </p>
      </div>
    </>
  )
}
