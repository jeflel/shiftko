import { supabase } from './supabase'

const SELECT_COLUMNS = 'id, nurse_id, unit, name, starts_at, ends_at, created_at, profiles!nurse_id ( full_name )'

// The signed-in nurse's own personal events in a date window (used by My
// Shifts). RLS already scopes this to `nurse_id = auth.uid()` rows plus
// whatever the "workspace members read" policy allows, but filtering by
// nurse_id here keeps this call's intent explicit.
export async function fetchMyPersonalEvents(userId, { start, end }) {
  const { data, error } = await supabase
    .from('personal_events')
    .select(SELECT_COLUMNS)
    .eq('nurse_id', userId)
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

// Every personal event visible to the signed-in user in a date window —
// workspace-wide per the personal-events product decision (HANDOFF.md
// §0.2), not unit-scoped like shifts. RLS's "workspace members read
// personal events" policy does the actual scoping; this fetches whatever
// that policy allows through.
export async function fetchWorkspacePersonalEvents({ start, end }) {
  const { data, error } = await supabase
    .from('personal_events')
    .select(SELECT_COLUMNS)
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createPersonalEvent({ nurseId, unit, name, startsAt, endsAt }) {
  const { data, error } = await supabase
    .from('personal_events')
    .insert({ nurse_id: nurseId, unit: unit || null, name: name || null, starts_at: startsAt, ends_at: endsAt })
    .select(SELECT_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function updatePersonalEvent(id, { unit, name, startsAt, endsAt }) {
  const { data, error } = await supabase
    .from('personal_events')
    .update({ unit: unit || null, name: name || null, starts_at: startsAt, ends_at: endsAt })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  if (error) throw error
  return data
}

// Coworkers scheduled on the same unit during a personal event's time window,
// used by the Edit-mode "Also on" match card. RLS's "nurses see unit shifts"
// policy already lets a nurse read scheduled shifts on her home unit, and the
// profiles!nurse_id join matches Team Schedule's. The viewer's own shifts are
// filtered out so the card lists only others.
export async function getCoworkersOnShift({ unit, startsAt, endsAt, excludeNurseId }) {
  let query = supabase
    .from('shifts')
    .select('starts_at, profiles!nurse_id ( full_name )')
    .eq('unit', unit)
    .eq('status', 'scheduled')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)
    .order('starts_at', { ascending: true })

  if (excludeNurseId) query = query.neq('nurse_id', excludeNurseId)

  const { data, error } = await query
  if (error) throw error

  return (data ?? [])
    .map((row) => ({ full_name: row.profiles?.full_name }))
    .filter((row) => row.full_name)
}

export async function deletePersonalEvent(id) {
  const { error } = await supabase.from('personal_events').delete().eq('id', id)
  if (error) throw error
}
