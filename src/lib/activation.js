import { supabase } from './supabase'

// The Home activation checklist ("Get started").
//
// The four nodes are POSITIONS, not tasks: "All set" is the terminal node, so
// the chip reads "Step n of 4" and maps 1:1 onto the track. Counting the three
// actionable steps instead ("1 of 3 done") leaves the reader working out which
// of the four dots the count refers to.
export const ACTIVATION_NODES = [
  { key: 'signedUp', label: 'Signed up' },
  { key: 'addedShift', label: 'Add a shift' },
  { key: 'claimedShift', label: 'Claim a shift' },
  { key: 'complete', label: 'All set' },
]

// Only the two real steps have a call to action. `action` is what the card's
// tap does: 'add' opens the personal event panel, 'claim' goes to the Pool.
const NEXT_STEPS = {
  addedShift: { action: 'add', title: 'Add a shift', subline: "Log a shift you're working" },
  claimedShift: { action: 'claim', title: 'Claim a shift', subline: 'Pick up an open shift' },
}

// Step state is DERIVED from data that already exists, never stored, so the
// checklist cannot drift from reality or need a backfill.
//
// Both counts are deliberately unfiltered. Home's personal-events fetch is
// windowed to today -> +56 days, so an event logged yesterday falls out of that
// window and a finished step would appear to un-finish. And a claim cannot be
// read off `shifts`, because coordinator-assigned shifts land in that same
// array, so a nurse who was handed a shift on day one would complete a step she
// never did.
async function fetchActivationSteps(userId) {
  const [eventsResult, claimsResult] = await Promise.all([
    supabase.from('personal_events').select('id', { count: 'exact', head: true }).eq('nurse_id', userId),
    supabase.from('shift_claims').select('id', { count: 'exact', head: true }).eq('nurse_id', userId),
  ])

  // A failed count reads as "not done yet" rather than throwing: a banner that
  // shows an extra step is a far smaller failure than a Home screen that blanks.
  return {
    addedShift: !eventsResult.error && (eventsResult.count ?? 0) > 0,
    claimedShift: !claimsResult.error && (claimsResult.count ?? 0) > 0,
  }
}

// `activation_dismissed_at` is the one column this feature owns. It is read in
// its own query rather than folded into Home's profile select so that a missing
// column degrades to "not dismissed" instead of taking the whole Home screen
// down with it.
export async function fetchActivationDismissed(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('activation_dismissed_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) return false
  return Boolean(data?.activation_dismissed_at)
}

// Dismissing RETIRES the checklist for good. It never blocks a step and never
// un-completes one; the section simply runs as Request Activity from then on.
// The same column is what "Got it" on the finished card writes, which is why
// one column is enough for both exits.
export async function dismissActivation(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ activation_dismissed_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}

export function deriveActivation({ addedShift, claimedShift, dismissed }) {
  const done = [true, addedShift, claimedShift, addedShift && claimedShift]
  const allDone = done[3]
  const currentIndex = allDone ? 3 : done.findIndex((isDone) => !isDone)

  return {
    done,
    allDone,
    currentIndex,
    // 'checklist' while there is something left to do, 'complete' for the
    // handoff card once every step is done, and 'notification' for a nurse who
    // dismissed it or has finished and acknowledged it. Home falls back to the
    // Request Activity tile whenever this is not 'checklist' or 'complete'.
    mode: dismissed ? 'notification' : allDone ? 'complete' : 'checklist',
    nextStep: NEXT_STEPS[ACTIVATION_NODES[currentIndex].key] ?? null,
  }
}

// One call for the whole model. The three reads go out together rather than in
// sequence, so the checklist costs one round trip, not three.
export async function fetchActivation(userId) {
  const [steps, dismissed] = await Promise.all([
    fetchActivationSteps(userId),
    fetchActivationDismissed(userId),
  ])

  return deriveActivation({ ...steps, dismissed })
}
