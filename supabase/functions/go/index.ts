import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('get_next_whatsapp')

  if (error || !data) {
    return new Response('No hay números disponibles', { status: 500 })
  }

  const mensaje = encodeURIComponent('Hola! Quiero más info')
  const url = `https://wa.me/${data}?text=${mensaje}`

  return Response.redirect(url, 302)
})