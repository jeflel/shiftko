import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // Scoped to the caller's own JWT, used only to verify who is calling.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: callerData, error: callerError } = await callerClient.auth.getUser()

  if (callerError || !callerData?.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const callerId = callerData.user.id

  // Service role client, only ever used to delete the verified caller's own id.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(callerId)

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500)
  }

  return jsonResponse({ success: true }, 200)
})
