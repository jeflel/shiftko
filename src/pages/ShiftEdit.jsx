import { NavRow } from '@/components/ui/nav-row'
import ShiftForm from '@/components/ShiftForm'

// Coordinator's Edit Shift screen, per ShiftEditLinearLight.dc.html. A thin
// pushed-screen shell that renders the shared ShiftForm in edit mode so the
// manage hub can open, save, and remove a shift without an inline panel.
export default function ShiftEdit({ shift, onBack, onSaved, onRemoved }) {
  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Edit Shift" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 px-5 pt-2.5 pb-12">
        <ShiftForm mode="edit" shift={shift} onSaved={onSaved} onRemoved={onRemoved} />
      </main>
    </div>
  )
}
