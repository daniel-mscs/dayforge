import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

const HABITOS = [
  { id: 'treino',       label: 'Treino',       icon: '🏋️' },
  { id: 'estudo',       label: 'Estudo',       icon: '📚' },
  { id: 'sono',         label: 'Sono ok',      icon: '😴' },
  { id: 'hidratacao',   label: 'Hidratação',   icon: '💧' },
  { id: 'alimentacao',  label: 'Alimentação',  icon: '🥗' },
  { id: 'produtividade',label: 'Produtividade',icon: '🎯' },
]

function formatarData(date) {
  return date.toISOString().split('T')[0]
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return formatarData(d)
  })
}

export default function Habitos({ user }) {
  const [registros, setRegistros] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [streak, setStreak] = useState(0)

  const hoje = formatarData(new Date())
  const ultimos7 = getLast7Days()

  const buscarHabitos = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase
      .from('habitos_registro')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', ultimos7[0])

    const mapa = {}
    ;(data || []).forEach(r => {
      if (!mapa[r.data]) mapa[r.data] = {}
      mapa[r.data][r.habito] = r.concluido
    })
    setRegistros(mapa)
    setStreak(calcularStreak(mapa))
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarHabitos() }, [buscarHabitos])

  function calcularStreak(mapa) {
    let s = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = formatarData(d)
      const h = mapa[key] || {}
      if (Object.values(h).some(v => v)) s++
      else if (i > 0) break
    }
    return s
  }

  const toggleHabito = async (habito) => {
    const atual = registros[hoje]?.[habito] || false
    const novo = !atual

    setRegistros(prev => ({
      ...prev,
      [hoje]: { ...prev[hoje], [habito]: novo }
    }))

    await supabase.from('habitos_registro').upsert({
      user_id: user.id,
      data: hoje,
      habito,
      concluido: novo
    }, { onConflict: 'user_id,data,habito' })

    const novoMapa = { ...registros, [hoje]: { ...registros[hoje], [habito]: novo } }
    setStreak(calcularStreak(novoMapa))
  }

  const habitosHoje = registros[hoje] || {}
  const concluidosHoje = HABITOS.filter(h => habitosHoje[h.id]).length

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando...</div>

  return (
    <div className="habitos-section">

      {/* Header */}
      <div className="habitos-header">
        <div>
          <div className="habitos-hoje-label">HOJE</div>
          <div className="habitos-hoje-data">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
        {streak > 0 && (
          <div className="habitos-streak">🔥 {streak} dia{streak > 1 ? 's' : ''}</div>
        )}
      </div>

      {/* Progresso do dia */}
      <div className="habitos-prog-card">
        <div className="habitos-prog-top">
          <span className="habitos-prog-num">{concluidosHoje}<span>/{HABITOS.length}</span></span>
          <span className="habitos-prog-label">hábitos hoje</span>
        </div>
        <div className="habitos-prog-bar-bg">
          <div
            className="habitos-prog-bar-fill"
            style={{ width: `${(concluidosHoje / HABITOS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Grid de hábitos */}
      <div className="habitos-grid">
        {HABITOS.map(h => {
          const done = !!habitosHoje[h.id]
          return (
            <div
              key={h.id}
              className={`habito-item ${done ? 'done' : ''}`}
              onClick={() => toggleHabito(h.id)}
            >
              <span className="habito-icon">{h.icon}</span>
              <span className="habito-label">{h.label}</span>
              <span className="habito-check">{done ? '✓' : '○'}</span>
            </div>
          )
        })}
      </div>

      {/* Histórico 7 dias */}
      <div className="habitos-historico">
        <div className="habitos-hist-title">ÚLTIMOS 7 DIAS</div>
        <div className="habitos-hist-grid">
          {ultimos7.map(data => {
            const h = registros[data] || {}
            const count = HABITOS.filter(hab => h[hab.id]).length
            const isHoje = data === hoje
            const d = new Date(data + 'T00:00:00')
            return (
              <div key={data} className="habitos-hist-dia">
                <div className="habitos-hist-weekday">
                  {d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                </div>
                <div
                  className={`habitos-hist-dot ${count === 0 ? 'zero' : count <= 2 ? 'low' : count <= 4 ? 'mid' : 'high'} ${isHoje ? 'hoje' : ''}`}
                  title={`${count}/${HABITOS.length} hábitos`}
                >
                  {count > 0 ? count : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}