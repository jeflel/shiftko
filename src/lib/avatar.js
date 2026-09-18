import { supabase } from './supabase'

const BUCKET = 'avatars'

// The largest place an avatar is drawn is Profile's 56px identity circle, which
// is 168 device pixels at 3x, so 512 is already generous headroom. A phone photo
// is 3-5MB though, and uploading the original would waste storage and a nurse's
// data on bytes no screen can show.
const MAX_EDGE = 512
const JPEG_QUALITY = 0.85

// Canvas rather than an image library: no new dependency for a centre crop and
// a JPEG encode, and the browser already ships both. The crop is square and
// centred because every avatar in the app is a circle, so a portrait photo
// otherwise gets its subject's head cut off by the circle mask.
async function toSquareJpeg(file) {
  const bitmap = await createImageBitmap(file)

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const edge = Math.min(MAX_EDGE, side)

    const canvas = document.createElement('canvas')
    canvas.width = edge
    canvas.height = edge

    const context = canvas.getContext('2d')
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      edge,
      edge,
    )

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )

    if (!blob) throw new Error('unsupported')
    return blob
  } finally {
    bitmap.close?.()
  }
}

export function avatarPublicUrl(path) {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Upload, then point the profile row at it, then drop the previous file. The
// order matters at each step: the old photo is only deleted after the new one is
// live and referenced, and a failed row write removes the file it just uploaded
// rather than leaving an orphan no row points at.
export async function uploadAvatar({ userId, file, previousPath }) {
  let blob

  try {
    blob = await toSquareJpeg(file)
  } catch {
    return { error: 'That file could not be read. Try a JPEG or PNG photo.' }
  }

  const path = `${userId}/avatar-${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) return { error: uploadError.message }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId)

  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path])
    return { error: updateError.message }
  }

  // Reported separately rather than swallowed. The row is what every screen
  // reads, so a failed cleanup must not fail the upload, but a silent one leaks
  // storage forever: that is exactly what happened before
  // 20260918020540 added the select policy a delete needs.
  let cleanupError = null
  if (previousPath && previousPath !== path) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath])
    cleanupError = removeError?.message ?? null
  }

  return { path, cleanupError }
}

export async function removeAvatar({ userId, previousPath }) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)

  if (error) return { error: error.message }

  let cleanupError = null
  if (previousPath) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath])
    cleanupError = removeError?.message ?? null
  }

  return { path: null, cleanupError }
}
