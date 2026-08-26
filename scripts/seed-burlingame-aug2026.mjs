// One-off seed script: Burlingame Skilled Nursing, Unit 1, August 2026 real schedule.
// Source: burlingame-august-2026-schedule-v2.md (Downloads)
// Scope decision (confirmed 2026-08-25): only A/P/N/AP/PN codes become shifts.
// All other codes (V, TF, TO, TO-AP, BH, VB, ON, LOA, ED, OR/or, NA) are skipped, not seeded.
// Negret, Davis: Aug 27-28 skipped (unreadable, highlighter mark).
// First NOC CNA row (Cinave/Linave, Erica): dropped entirely (ambiguous name, no visible shifts anyway).
//
// Times: AM 7:00-15:30, PM 15:00-23:30, NOC 23:00-07:30 (next day)
// Run: node scripts/seed-burlingame-aug2026.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jffdmybgwiyfhwrkipug.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const UNIT = 'Unit 1'
const PASSWORD = 'shiftko123'
const YEAR = 2026
const MONTH = 7 // 0-indexed: August

const TIMES = {
  A: ['07:00', '15:30'],
  P: ['15:00', '23:30'],
  N: ['23:00', '07:30'], // ends next day
}

// name, title (credential), employment_type -> not stored directly but kept for reference
const staff = [
  ['Keslyn Yamat', 'LVN'],
  ['Analiza Bangcong', 'LVN'],
  ['Catanyag, Aeron', 'LVN'],
  ['Cardova, Marilyz', 'LVN'],
  ['Viraya Bergado', 'LVN'],
  ['Dang, Devin', 'RN'],
  ['Barmas, Dagmara', 'LVN'],
  ['Ana Florendo', 'LVN'],
  ['Pacion, Rachel', 'LVN'],
  ['Donshue, Galina', 'LVN'],
  ['Gonzales, Sabrina', 'LVN'],
  ['Isidro, Violet', 'CNA'],
  ['Bartholomeu, Guilherme', 'CNA'],
  ['Barnum, Marissa', 'CNA'],
  ['Yamat, Laila', 'CNA'],
  ['Dominique, Raven', 'CNA'],
  ['Enjerto, Monica', 'CNA'],
  ['Negret, Davis', 'CNA'],
  ['Payne, Audrey', 'CNA'],
  ['Walker, Shayla', 'CNA'],
  ['Silva, Maria', 'CNA'],
  ['Onphukhao, Sasiwan', 'CNA'],
  ['David, Maricel', 'CNA'],
  ['Su, Hanni', 'CNA'],
  ['Valdez, Emily', 'CNA'],
  ['SinoCruz, Sharomae', 'CNA'],
  ['Francisco, Anthony', 'CNA'],
  ['Sidhu, Ashmit', 'CNA'],
  ['Soe, Yati Su', 'CNA'],
  ['Chanaudompassorn, Lee', 'CNA'],
  ['Concepcion, Lourdes', 'CNA'],
  ['Oare, Eremiokinaie', 'CNA'],
  ['Concepcion, Jefferson', 'CNA'],
  ['Wakamaya, Jordan', 'CNA'],
  ['Paul, Sonia', 'CNA'],
  ['Martinez, Aaliyah', 'CNA'],
]
// Skipped on purpose: Kaur/Khatri (no entries), Gonzales Jonathan/Open positions (no entries),
// Cinave/Linave Erica (ambiguous name, no entries), Rayford Jasmine (no entries but kept in roster
// in case future data has her - remove if creating account for a no-shift person is undesired)

// raw daily strings, filtered to only A/P/N/AP/PN tokens later
const schedules = {
  'Keslyn Yamat': '1:A 4:A 5:AP 6:A 7:AP 9:ED 10:AP 11:V 12:V 13:V 16:AP 17:A 18:V 19:V 22:A 23:AP 24:A 25:AP 28:A 29:A 30:AP 31:AP',
  'Analiza Bangcong': '1:TF 2:A 3:A 6:A 7:A 8:A 9:A 11:ED 12:A 13:A 14:A 15:A 18:A 19:A 20:A 21:A 24:A 25:A 26:A 27:A 30:A 31:A',
  'Catanyag, Aeron': '2:A 3:A 4:A 5:A 8:A 9:A 10:A 11:A 14:A 15:A 16:A 17:A 20:A 21:A 22:A 23:A 26:A 27:A 28:A 29:A',
  'Cardova, Marilyz': '2:A 3:A 4:A 5:A 8:A 9:A 10:A 11:A 14:A 15:A 16:A 17:A 21:A 22:A 23:A 26:A 27:A 28:A 29:A',
  'Viraya Bergado': '1:P 2:P 3:P 6:P 7:PN 8:PN 9:P 12:P 13:P 14:P 15:P 18:BH 19:V 20:V 21:V 24:V 25:V 26:V 27:V 30:V 31:V',
  'Dang, Devin': '1:P 2:TF 3:TO 5:P 6:P 7:P 10:P 11:P 12:P 13:P 16:P 17:P 18:P 19:P 22:P 23:P 24:P 25:P 28:P 29:P 30:P 31:P',
  'Barmas, Dagmara': '1:TF 3:AP 4:P 5:P 6:P 7:P 8:TO-AP 9:TO-AP 10:P 11:P 12:AP 13:P 17:P 18:P 19:P 21:TO 22:AP 23:AP 24:P 25:P 28:P 29:P 30:P 31:P',
  'Ana Florendo': '2:N 3:N 4:N 5:N 8:N 9:N 10:N 11:N 14:N 15:N 16:N 17:N 20:N 21:N 22:N 23:N 26:N 27:N 28:N 29:N',
  'Pacion, Rachel': '1:N 2:PN 3:N 6:N 7:VB 8:VB 9:ON 12:N 13:N 14:PN 15:PN 18:N 19:N 20:PN 21:PN 24:N 25:N 26:PN 27:PN 30:N 31:N',
  'Donshue, Galina': '1:V 2:V 3:V 4:V 7:V 8:V 9:V 10:V 13:V 14:V 15:V 16:V 19:V 20:V 21:V 22:V 25:V 26:V 27:V 28:V 31:N',
  'Gonzales, Sabrina': '1:N 2:N 6:N 7:N 8:N 14:N 15:N 16:N 21:N 22:N 23:N 28:N 29:N 30:N',
  'Isidro, Violet': '1:P 2:P 3:A 4:A 7:P 8:P 9:P 10:AP 14:P 15:P 16:P 17:AP 21:P 22:P 23:P 24:AP 28:P 29:P 30:P 31:AP',
  'Bartholomeu, Guilherme': '4:AP 6:AP 11:AP 13:AP 18:AP 20:AP 25:AP 27:AP',
  'Barnum, Marissa': '1:AP 2:AP 3:AP 4:A 8:AP 9:AP 10:AP 11:A 15:AP 16:AP 17:AP 18:A 22:AP 23:A 24:AP 25:A 29:AP 30:AP 31:AP',
  'Yamat, Laila': '1:A 2:A 3:A 4:A 8:A 9:A 10:A 11:A 15:A 16:A 17:A 18:A 22:A 23:A 24:A 25:A 29:A 30:A 31:A',
  'Dominique, Raven': '1:A 2:AP 3:AP 4:AP 5:ED 7:A 8:A 9:A 10:AP 11:ED 13:AP 14:A 15:AP 16:AP 17:ED 19:A 20:AP 21:A 22:AP 23:ED 25:AP 26:A 27:A 28:AP 31:A',
  'Enjerto, Monica': '1:V 4:A 5:A 6:A 7:A 10:A 11:A 12:A 13:A 16:A 17:A 18:A 19:A 22:A 23:A 24:A 25:A 28:A 29:A 30:A 31:A',
  'Negret, Davis': '1:A 2:A 5:A 6:A 7:V 8:V 11:A 12:A 13:A 14:A 17:A 18:A 19:A 20:A 23:A 24:A 25:A 26:A 29:A 30:A 31:A', // 27-28 skipped: unreadable
  'Payne, Audrey': '3:A 4:A 5:A 6:A 9:A 10:A 11:A 12:A 15:A 16:A 17:A 18:A 21:A 22:A 23:A 24:A 27:A 28:A 29:A 30:A',
  'Walker, Shayla': '3:A 4:AP 5:AP 6:A 10:A 11:AP 12:AP 13:A 17:A 18:AP 19:AP 20:A 24:A 25:AP 26:AP 27:A 31:A',
  'Silva, Maria': '1:A 4:V 5:A 6:A 7:A 10:A 11:A 12:A 13:A 15:A 16:A 17:A 18:A 19:A 21:A 22:A 23:A 24:A 28:A 29:A 30:A 31:A',
  'Onphukhao, Sasiwan': '1:A 4:A 5:A 7:A 8:A 11:A 12:A 14:A 15:A 18:A 19:A 21:A 22:A 25:A 26:A 28:A 29:A',
  'David, Maricel': '2:A 3:A 4:A 10:A 11:A 16:A 17:A 18:A 22:A 23:A 24:A 30:A 31:A',
  'Su, Hanni': '2:AP 9:A 16:A 23:A 30:A 9:A 17:P 18:P 24:P 25:P 31:P', // AM row + PM row merged
  'Valdez, Emily': '2:P 7:P 9:P 12:P 13:P 16:P 17:P 18:P 19:P 22:P 23:P 24:P 25:P 28:P 29:P 30:P 31:P',
  'SinoCruz, Sharomae': '1:P 4:P 5:P 6:P 7:P 10:P 11:P 12:P 13:P 15:P 18:P 19:P 20:P 22:P 25:P 26:P 27:P 29:P',
  'Francisco, Anthony': '1:P 4:P 5:P 6:P 8:P 11:P 13:P 14:P 15:P 16:P 19:P 20:P 21:P 22:P 25:P 26:P 27:P 28:P 31:P',
  'Sidhu, Ashmit': '7:P 8:P 9:P 10:P 16:A 23:A 30:A', // 'or' (orientation) entries skipped
  'Soe, Yati Su': '3:P 4:P 12:AP 13:P 14:AP 15:AP 16:A 19:A 20:A 21:A 22:AP 23:A 26:A 27:A 28:AP 29:AP 30:A',
  'Chanaudompassorn, Lee': '1:AP 2:A', // rest of row is V (vacation), skipped
  'Concepcion, Lourdes': '3:N 4:PN 5:PN 6:PN 9:N 10:N 11:N 12:N', // rest of row is V, skipped
  'Oare, Eremiokinaie': '2:N 5:N 6:N 7:N 8:N 11:N 12:N 13:N 16:N 17:N 18:N 19:N 22:N 23:N 24:N 25:N 28:N 29:N 30:N',
  'Concepcion, Jefferson': '4:N 5:N 6:N 7:N 10:N 11:N 12:N 13:N 15:PN 16:PN 17:PN 18:PN 21:PN 22:PN 23:PN 24:PN 27:PN 28:PN 29:PN 30:PN',
  'Wakamaya, Jordan': '3:PN 4:PN 5:PN 6:PN 9:PN 10:PN 11:PN 12:PN',
  'Paul, Sonia': '16:AP 17:N 18:N 19:N 20:PN 23:N 24:N 30:N',
  'Martinez, Aaliyah': '2:N 3:N 6:N 9:AP 10:N 11:N 12:N',
}

function slugEmail(name) {
  return name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '') + '@shiftko.test'
}

function parseShifts(str) {
  // returns list of {day, period}
  const out = []
  if (!str) return out
  for (const tok of str.trim().split(/\s+/)) {
    const [dayStr, code] = tok.split(':')
    const day = parseInt(dayStr, 10)
    if (!day) continue
    if (code === 'A') out.push({ day, period: 'A' })
    else if (code === 'P') out.push({ day, period: 'P' })
    else if (code === 'N') out.push({ day, period: 'N' })
    else if (code === 'AP') { out.push({ day, period: 'A' }); out.push({ day, period: 'P' }) }
    else if (code === 'PN') { out.push({ day, period: 'P' }); out.push({ day, period: 'N' }) }
    // everything else (V, TF, TO, TO-AP, BH, VB, ON, LOA, ED, OR/or, NA, UNCLEAR...) intentionally skipped
  }
  return out
}

function toTimestamp(day, hhmm, rollover) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(Date.UTC(YEAR, MONTH, day + (rollover ? 1 : 0), h, m))
  // Note: using UTC as a stand-in; adjust to facility timezone (America/Los_Angeles) if precision matters downstream.
  return d.toISOString()
}

async function main() {
  const results = { created: [], skipped: [], shiftsInserted: 0, errors: [] }

  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const existingByEmail = new Map((existingList?.users || []).map(u => [u.email, u.id]))

  for (const [name, title] of staff) {
    const email = slugEmail(name)
    let userId = existingByEmail.get(email)
    if (!userId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      if (createErr) {
        results.errors.push(`${name}: auth create failed - ${createErr.message}`)
        continue
      }
      userId = created.user.id
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        role: 'nurse',
        credential: title,
        home_unit: UNIT,
        email,
      })
    if (profileErr) {
      results.errors.push(`${name}: profile upsert failed - ${profileErr.message}`)
      continue
    }
    results.created.push(name)

    const shiftEntries = parseShifts(schedules[name] || '')
    for (const { day, period } of shiftEntries) {
      const [startHHMM, endHHMM] = TIMES[period]
      const rollover = period === 'N'
      const starts_at = toTimestamp(day, startHHMM, false)
      const ends_at = toTimestamp(day, endHHMM, rollover)
      const { error: shiftErr } = await supabase.from('shifts').insert({
        nurse_id: userId,
        unit: UNIT,
        starts_at,
        ends_at,
        status: 'scheduled',
      })
      if (shiftErr) {
        results.errors.push(`${name} day ${day} ${period}: shift insert failed - ${shiftErr.message}`)
      } else {
        results.shiftsInserted++
      }
    }
  }

  console.log(JSON.stringify(results, null, 2))
}

main()
