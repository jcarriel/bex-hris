import { UserPlus, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export function ReclutamientoPage() {
  return (
    <div>
      <PageHeader
        title="Reclutamiento"
        description="Gestión de vacantes y candidatos"
        breadcrumb={[{ label: 'Módulos' }, { label: 'Reclutamiento' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={15} />
            Nueva vacante
          </button>
        }
      />
      <div
        className="rounded-2xl border p-16 flex flex-col items-center text-center"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
          <UserPlus size={40} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-1)] mb-2">Módulo de Reclutamiento</h2>
        <p className="text-sm text-[var(--text-2)] max-w-sm mb-6">
          Aquí podrás publicar vacantes, gestionar candidatos, programar entrevistas
          y dar seguimiento a todo el proceso de selección.
        </p>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={15} />
          Publicar primera vacante
        </button>
      </div>
    </div>
  )
}
