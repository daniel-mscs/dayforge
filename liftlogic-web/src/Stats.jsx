import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function formatarData(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return formatarData(d)
  })
}

function round1(n) { return Math.round(n * 10) / 10 }

export default function Stats({ user }) {
  const [treinos, setTreinos]   = useState([])
  const [agua, setAgua]         = useState([])
  const [aguaMeta, setAguaMeta] = useState(2500)
  const [pesos, setPesos]       = useState([])
  const [macros, setMacros]     = useState([])
  const [passos, setPassos]     = useState([])
  const [passosMeta, setPassosMeta] = useState(10000)
  const [carregando, setCarregando] = useState(true)

  const ultimos7 = getLast7Days()
  const inicio = ultimos7[0]

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [
      { data: treinosData },
      { data: aguaData },
      { data: aguaMetaData },
      { data: pesosData },
      { data: macrosData },
      { data: passosData },
      { data: passosMetaData },
    ] = await Promise.all([
      supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).gte('created_at', inicio).order('created_at', { ascending: true }),
      supabase.from('agua_registro').select('*').eq('user_id', user.id).gte('data', inicio),
      supabase.from('agua_meta').select('meta_ml').eq('user_id', user.id).single(),
      supabase.from('peso_registro').select('*').eq('user_id', user.id).gte('data', inicio).order('data', { ascending: true }),
      supabase.from('macros_registro').select('*').eq('user_id', user.id).gte('data', inicio),
      supabase.from('passos_registro').select('*').eq('user_id', user.id).gte('data', inicio),
      supabase.from('passos_meta').select('meta_passos').eq('user_id', user.id).single(),
    ])
    setTreinos(treinosData || [])
    setAgua(aguaData || [])
    if (aguaMetaData) setAguaMeta(aguaMetaData.meta_ml)
    setPesos(pesosData || [])
    setMacros(macrosData || [])
    setPassos(passosData || [])
    if (passosMetaData) setPassosMeta(passosMetaData.meta_passos)
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  // Treinos
  const totalTreinos = treinos.length
  const treinosLetras = [...new Set(treinos.map(t => t.treino))].sort().join(', ')
  const tempoTotal = treinos.reduce((s, t) => s + (t.tempo_segundos || 0), 0)
  const kcalTotal = treinos.reduce((s, t) => s + (t.kcal || 0), 0)
  const formatarTempo = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    return `${m}min`
  }

  // Água por dia
  const aguaPorDia = ultimos7.map(data => {
    const regs = agua.filter(r => r.data === data)
    return { data, total: regs.reduce((s, r) => s + r.ml, 0) }
  })
  const mediaAgua = Math.round(aguaPorDia.reduce((s, d) => s + d.total, 0) / 7)
  const diasMetaAgua = aguaPorDia.filter(d => d.total >= aguaMeta).length

  // Peso
  const pesoDados = ultimos7.map(data => {
    const reg = pesos.find(r => r.data === data)
    return { data, peso: reg ? Number(reg.peso) : null }
  }).filter(d => d.peso !== null)
  const variacaoPeso = pesoDados.length >= 2
    ? round1(pesoDados[pesoDados.length - 1].peso - pesoDados[0].peso)
    : null

  // Macros por dia
  const macrosPorDia = ultimos7.map(data => {
    const regs = macros.filter(r => r.data === data)
    return {
      data,
      kcal: Math.round(regs.reduce((s, r) => s + r.kcal, 0)),
      prot: round1(regs.reduce((s, r) => s + Number(r.prot), 0)),
      carb: round1(regs.reduce((s, r) => s + Number(r.carb), 0)),
      gord: round1(regs.reduce((s, r) => s + Number(r.gord), 0)),
    }
  })
  const diasComMacros = macrosPorDia.filter(d => d.kcal > 0)
  const mediaKcal = diasComMacros.length > 0
    ? Math.round(diasComMacros.reduce((s, d) => s + d.kcal, 0) / diasComMacros.length)
    : 0
  const mediaProt = diasComMacros.length > 0
    ? round1(diasComMacros.reduce((s, d) => s + d.prot, 0) / diasComMacros.length)
    : 0

  // Passos por dia
  const passosPorDia = ultimos7.map(data => {
    const reg = passos.find(r => r.data === data)
    return { data, passos: reg?.passos || 0 }
  })
  const mediaPassos = Math.round(passosPorDia.reduce((s, d) => s + d.passos, 0) / 7)
  const diasMetaPassos = passosPorDia.filter(d => d.passos >= passosMeta).length

  const labelDia = (data) => new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })

  const tooltipStyle = { background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 12 }

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando...</div>

  return (
    <div className="stats-section">
      <h2 className="title-divisao">📊 Stats da Semana</h2>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: -8 }}>
        {new Date(inicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} —{' '}
        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </p>

      {/* TREINOS */}
      <div className="stats-card">
        <div className="stats-card-title">⚔️ TREINOS</div>
        {totalTreinos === 0 ? (
          <p className="empty-msg" style={{ fontSize: 13 }}>Nenhum treino essa semana.</p>
        ) : (
          <>
            <div className="stats-grid-4">
              <div className="stats-item">
                <span>Quantidade</span>
                <strong>{totalTreinos}</strong>
              </div>
              <div className="stats-item">
                <span>Divisões</span>
                <strong>{treinosLetras || '—'}</strong>
              </div>
              <div className="stats-item">
                <span>Tempo total</span>
                <strong>{formatarTempo(tempoTotal)}</strong>
              </div>
              <div className="stats-item">
                <span>Kcal total</span>
                <strong>{kcalTotal > 0 ? kcalTotal : '—'}</strong>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={treinos.map(t => ({
                  name: `${t.treino} ${new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
                  min: Math.round((t.tempo_segundos || 0) / 60)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} min`]} />
                  <Bar dataKey="min" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* ÁGUA */}
      <div className="stats-card">
        <div className="stats-card-title">💧 ÁGUA</div>
        <div className="stats-grid-2">
          <div className="stats-item">
            <span>Média diária</span>
            <strong>{mediaAgua > 0 ? `${(mediaAgua/1000).toFixed(1)}L` : '—'}</strong>
          </div>
          <div className="stats-item">
            <span>Dias c/ meta</span>
            <strong style={{ color: diasMetaAgua >= 5 ? '#10b981' : '#f97316' }}>{diasMetaAgua}/7</strong>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={aguaPorDia.map(d => ({ name: labelDia(d.data), ml: d.total }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} ml`]} />
              <Bar dataKey="ml" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PESO */}
      <div className="stats-card">
        <div className="stats-card-title">⚖️ PESO</div>
        {pesoDados.length === 0 ? (
          <p className="empty-msg" style={{ fontSize: 13 }}>Nenhum registro essa semana.</p>
        ) : (
          <>
            <div className="stats-grid-2">
              <div className="stats-item">
                <span>Registros</span>
                <strong>{pesoDados.length}/7 dias</strong>
              </div>
              <div className="stats-item">
                <span>Variação</span>
                <strong style={{ color: variacaoPeso === null ? '#64748b' : variacaoPeso < 0 ? '#10b981' : variacaoPeso > 0 ? '#ef4444' : '#64748b' }}>
                  {variacaoPeso === null ? '—' : `${variacaoPeso > 0 ? '+' : ''}${variacaoPeso} kg`}
                </strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={pesoDados.map(d => ({ name: labelDia(d.data), peso: d.peso }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kg`]} />
                  <Line type="monotone" dataKey="peso" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* MACROS */}
      <div className="stats-card">
        <div className="stats-card-title">🍽️ MACROS</div>
        {diasComMacros.length === 0 ? (
          <p className="empty-msg" style={{ fontSize: 13 }}>Nenhum registro essa semana.</p>
        ) : (
          <>
            <div className="stats-grid-4">
              <div className="stats-item">
                <span>Média kcal</span>
                <strong>{mediaKcal}</strong>
              </div>
              <div className="stats-item">
                <span>Média prot</span>
                <strong>{mediaProt}g</strong>
              </div>
              <div className="stats-item">
                <span>Dias registrados</span>
                <strong>{diasComMacros.length}/7</strong>
              </div>
              <div className="stats-item">
                <span>Kcal total</span>
                <strong>{diasComMacros.reduce((s, d) => s + d.kcal, 0)}</strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={macrosPorDia.map(d => ({ name: labelDia(d.data), kcal: d.kcal }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kcal`]} />
                  <Bar dataKey="kcal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* PASSOS */}
      <div className="stats-card">
        <div className="stats-card-title">👟 PASSOS</div>
        {passosPorDia.every(d => d.passos === 0) ? (
          <p className="empty-msg" style={{ fontSize: 13 }}>Nenhum registro essa semana.</p>
        ) : (
          <>
            <div className="stats-grid-2">
              <div className="stats-item">
                <span>Média diária</span>
                <strong>{mediaPassos > 0 ? mediaPassos.toLocaleString('pt-BR') : '—'}</strong>
              </div>
              <div className="stats-item">
                <span>Dias c/ meta</span>
                <strong style={{ color: diasMetaPassos >= 5 ? '#10b981' : '#f97316' }}>{diasMetaPassos}/7</strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={passosPorDia.map(d => ({ name: labelDia(d.data), passos: d.passos }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v.toLocaleString('pt-BR')} passos`]} />
                  <Bar dataKey="passos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

    </div>
  )
}