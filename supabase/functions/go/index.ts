import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('get_next_whatsapp')

  if (error || !data || data.length === 0) {
    return new Response('No hay números disponibles', { status: 500 })
  }

  const { numero, mensaje, nombre, orden } = data[0]
  const mensajeCodificado = encodeURIComponent(mensaje)

  await supabase
    .from('rotator_state')
    .update({
      ultimo_orden: orden ?? null,
      ultimo_numero: numero,
      ultimo_numero_nombre: nombre ?? null
    })
    .eq('id', 1)

  const url = `https://wa.me/${numero}?text=${mensajeCodificado}`

  return Response.redirect(url, 302)
})