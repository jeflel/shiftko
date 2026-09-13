import { supabase } from './supabase'

// A nurse's pending claim on an open/offered shift. Shared by Pool's inline
// claim/withdraw and ShiftDetail's open-shift Claim CTA.
export async function createClaim({ shiftId, nurseId }) {
  const { data, error } = await supabase
    .from('shift_claims')
    .insert({
      shift_id: shiftId,
      nurse_id: nurseId,
      status: 'pending',
      claimed_at: new Date().toISOString(),
    })
    .select('id, shift_id, nurse_id, status')
    .single()

  return { claim: data ?? null, error: error?.message ?? null }
}

export async function deleteClaim({ shiftId, nurseId }) {
  const { error } = await supabase
    .from('shift_claims')
    .delete()
    .eq('nurse_id', nurseId)
    .eq('shift_id', shiftId)

  return { error: error?.message ?? null }
}
