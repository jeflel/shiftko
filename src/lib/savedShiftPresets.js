import { supabase } from './supabase'

export const MAX_SAVED_SHIFT_PRESETS = 5

// Formats a JS Date's local time as 'HH:MM:SS' for Postgres `time`.
function toTimeString(hours, minutes = 0) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

export async function fetchSavedShiftPresets(userId) {
  const { data, error } = await supabase
    .from('saved_shift_presets')
    .select('id, label, start_time, end_time, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function saveShiftPreset(userId, { startHours, startMinutes, endHours, endMinutes, label }) {
  const { data, error } = await supabase
    .from('saved_shift_presets')
    .insert({
      user_id: userId,
      label: label || null,
      start_time: toTimeString(startHours, startMinutes),
      end_time: toTimeString(endHours, endMinutes),
    })
    .select('id, label, start_time, end_time, created_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteShiftPreset(presetId) {
  const { error } = await supabase.from('saved_shift_presets').delete().eq('id', presetId)
  if (error) throw error
}

// 'HH:MM:SS' -> { hours, minutes } for feeding back into the time inputs.
export function parsePresetTime(timeString) {
  const [h, m] = timeString.split(':').map(Number)
  return { hours: h, minutes: m }
}
