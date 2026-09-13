import { NavRow } from '@/components/ui/nav-row'
import ShiftForm from '@/components/ShiftForm'

// Coordinator's Post a Shift form, per PostShiftLinearLight.dc.html. Moved
// out of Schedule.jsx's ManageTab into its own pushed screen, reachable both
// directly from Home's Post Shift tile and from CoordinatorManage's hub CTA.
// The form body itself now lives in the shared ShiftForm component so the
// upcoming Edit Shift screen can reuse it.
export default function PostShift({ onBack }) {
  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Post a Shift" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 px-5 pt-2.5 pb-12">
        <ShiftForm mode="create" />
      </main>
    </div>
  )
}
