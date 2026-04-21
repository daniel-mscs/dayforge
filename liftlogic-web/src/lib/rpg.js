import { supabase } from './supabase'

const XP_REGRAS = {
  treino_finalizado:  50,
  habito_concluido:   10,
  meta_agua:          20,
  meta_passos:        20,
  peso_registrado:     5,
  macros_registrado:  15,
  streak_diario:      10,
}

export async function ganharXP(userId, motivo) {
  const xp = XP_REGRAS[motivo]
  if (!xp) return

  const motivoTexto = {
    treino_finalizado:  '🏋️ Treino finalizado',
    habito_concluido:   '✅ Hábito concluído',
    meta_agua:          '💧 Meta de água batida',
    meta_passos:        '👟 Meta de passos batida',
    peso_registrado:    '⚖️ Peso registrado',
    macros_registrado:  '🍽️ Macros registrados',
    streak_diario:      '🔥 Streak diário',
  }[motivo]

  await supabase.from('rpg_xp_log').insert([{ user_id: userId, xp, motivo: motivoTexto }])

    const hoje = new Date()
    const offset = hoje.getTimezoneOffset()
    const hojeStr = new Date(hoje.getTime() - offset * 60000).toISOString().split('T')[0]

    const MISSAO_MAP = {
      treino_finalizado: 'treino_finalizado',
      habito_concluido:  'habito_concluido',
      meta_agua:         'beber_agua',
      peso_registrado:   'registrar_peso',
      macros_registrado: 'macros_registrado',
      meta_passos:       'passos_registrado',
    }

    const missaoId = MISSAO_MAP[motivo]
    if (missaoId) {
      await supabase.from('rpg_missoes_log').insert([{
        user_id: userId, missao_id: missaoId, data: hojeStr
      }]).select()
    }

  const { data } = await supabase.from('rpg_perfil').select('xp, streak, ultimo_dia_ativo').eq('user_id', userId).single()
    const novoXP = (data?.xp || 0) + xp

    // Streak global
    const hoje2 = new Date()
    const off2 = hoje2.getTimezoneOffset()
    const hojeStr2 = new Date(hoje2.getTime() - off2 * 60000).toISOString().split('T')[0]
    const ontem = new Date(hoje2.getTime() - off2 * 60000 - 86400000).toISOString().split('T')[0]

    const ultimoDia = data?.ultimo_dia_ativo || ''
    let novoStreak = data?.streak || 0
    let xpStreak = 0

    if (ultimoDia !== hojeStr2) {
      if (ultimoDia === ontem) {
        novoStreak += 1
      } else if (ultimoDia !== hojeStr2) {
        novoStreak = 1
      }
      if (novoStreak > 1) {
        xpStreak = Math.min(novoStreak * 5, 50)
        await supabase.from('rpg_xp_log').insert([{
          user_id: userId,
          xp: xpStreak,
          motivo: `🔥 Streak de ${novoStreak} dias (+${xpStreak} XP bônus)`
        }])
      }
    }

  const nivel = novoXP >= 2000 ? 5 : novoXP >= 1000 ? 4 : novoXP >= 500 ? 3 : novoXP >= 200 ? 2 : 1

  await supabase.from('rpg_perfil').upsert({
      user_id: userId,
      xp: novoXP + xpStreak,
      nivel,
      streak: novoStreak,
      ultimo_dia_ativo: hojeStr2,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
}