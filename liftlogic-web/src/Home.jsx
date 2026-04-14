import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Habitos from './Habitos'
import Dieta from './Dieta'
import Suplementos from './Suplementos'

const FRASES = [
  "Disciplina é fazer o que precisa ser feito, mesmo quando não quer. 💪",
  "Pequenas ações consistentes constroem grandes resultados. 🎯",
  "Você está construindo o futuro enquanto cuida do presente. 🚀",
  "Consistência bate talento quando o talento não é consistente. 🔥",
  "Você tem poder sobre sua mente, não sobre os eventos externos. — Marco Aurélio 🏛️",
  "Faça cada ato de sua vida como se fosse o último. — Marco Aurélio 🏛️",
  "Não é o que acontece com você, mas como você reage a isso que importa. — Epicteto 🏛️",
  "Enquanto adiamos, a vida passa. — Sêneca 🏛️",
  "Não é porque as coisas são difíceis que não ousamos. — Sêneca 🏛️",
  "Temos dois ouvidos e uma boca para ouvir o dobro do que falamos. — Epicteto 🏛️",
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarData(date) {
  return date.toISOString().split('T')[0]
}

function diasDesdeData(dataStr) {
  if (!dataStr) return null
  return Math.floor((Date.now() - new Date(dataStr).getTime()) / 86400000)
}

function getDaysLeft() {
  const hoje = new Date()
  const fimAno = new Date(hoje.getFullYear(), 11, 31)
  const diasRestantes = Math.ceil((fimAno - hoje) / 86400000)
  const diaDoAno = Math.ceil((hoje - new Date(hoje.getFullYear(), 0, 1)) / 86400000)
  const totalDias = hoje.getFullYear() % 4 === 0 ? 366 : 365
  return { diasRestantes, pct: Math.round((diaDoAno / totalDias) * 100) }
}

export default function Home({ user, onIniciarTreino, treinando, treinoAtivo, divisao }) {
  const [perfil, setPerfil]       = useState(null)
  const [historico, setHistorico] = useState([])
  const [streak, setStreak]       = useState(0)
  const [aguaHoje, setAguaHoje]   = useState({ total: 0, meta: 2500 })
  const [pesoHoje, setPesoHoje]   = useState(null)
  const [pesoPrev, setPesoPrev]   = useState(null)
  const [rotina, setRotina]       = useState(null)
  const [carregando, setCarregando] = useState(true)

  const hoje = formatarData(new Date())

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [
      { data: p },
      { data: h },
      { data: aguaRegs },
      { data: aguaMeta },
      { data: pesoRegs },
      { data: diasData },
    ] = await Promise.all([
      supabase.from('perfil').select('*').eq('user_id', user.id).single(),
      supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('agua_registro').select('ml').eq('user_id', user.id).eq('data', hoje),
      supabase.from('agua_meta').select('meta_ml').eq('user_id', user.id).single(),
      supabase.from('peso_registro').select('*').eq('user_id', user.id).order('data', { ascending: false }).limit(2),
      supabase.from('rotina_dias').select('id,data').eq('user_id', user.id).eq('data', hoje).single(),
    ])

    if (p) setPerfil(p)
    if (h) { setHistorico(h); setStreak(calcularStreak(h)) }

    const totalAgua = (aguaRegs || []).reduce((s, r) => s + r.ml, 0)
    setAguaHoje({ total: totalAgua, meta: aguaMeta?.meta_ml || 2500 })

    if (pesoRegs && pesoRegs.length > 0) {
      setPesoHoje(pesoRegs[0])
      setPesoPrev(pesoRegs[1] || null)
    }

    if (diasData) {
      const { data: tarefasData } = await supabase
        .from('rotina_tarefas').select('*').eq('dia_id', diasData.id).order('ordem', { ascending: true })
      setRotina({ dia: diasData, tarefas: tarefasData || [] })
    }

    setCarregando(false)
  }, [user.id, hoje])

  useEffect(() => { carregar() }, [carregar])

  function calcularStreak(hist) {
    if (!hist || hist.length === 0) return 0
    let s = 0
    const diasTreino = new Set(hist.map(t => new Date(t.created_at).toLocaleDateString('pt-BR')))
    for (let i = 0; i < 60; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (diasTreino.has(d.toLocaleDateString('pt-BR'))) s++
      else if (i > 0) break
    }
    return s
  }

  const toggleTarefa = async (tarefa) => {
    const nova = !tarefa.concluida
    await supabase.from('rotina_tarefas').update({ concluida: nova }).eq('id', tarefa.id)
    setRotina(prev => ({
      ...prev,
      tarefas: prev.tarefas.map(t => t.id === tarefa.id ? { ...t, concluida: nova } : t)
    }))
  }

  const nome = perfil?.nome ? perfil.nome.split(' ')[0] : user.email.split('@')[0]
  const frase = FRASES[new Date().getDate() % FRASES.length]
  const { diasRestantes, pct: pctAno } = getDaysLeft()
  const pctAgua = Math.min(100, Math.round((aguaHoje.total / aguaHoje.meta) * 100))
  const diffPeso = pesoHoje && pesoPrev ? (Number(pesoHoje.peso) - Number(pesoPrev.peso)).toFixed(1) : null

  const PERIODOS = ['Acordar', 'Manhã', 'Tarde', 'Noite']
  const tarefasPorPeriodo = rotina
    ? PERIODOS.reduce((acc, p) => {
        const itens = rotina.tarefas.filter(t => t.periodo === p && t.texto)
        if (itens.length > 0) acc[p] = itens
        return acc
      }, {})
    : {}
  const temTarefas = Object.keys(tarefasPorPeriodo).length > 0

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 60 }}>Carregando...</div>

  return (
    <div className="home-section">

      {/* Saudação + streak */}
      <div className="home-header">
        <div>
          <h2 className="home-greeting">{getGreeting()}, {nome}!</h2>
          <p className="home-date">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {streak > 0 && <div className="home-streak">🔥 {streak} dia{streak > 1 ? 's' : ''}</div>}
      </div>

      {/* Frase motivacional */}
      <div className="home-frase">{frase}</div>

      {/* Contador fim do ano */}
      <div className="home-countdown">
        <span className="home-countdown-icon">⏳</span>
        <div className="home-countdown-body">
          <div className="home-countdown-dias">{diasRestantes} dias</div>
          <div className="home-countdown-label">restam até o fim de {new Date().getFullYear()} · {pctAno}% do ano passou</div>
          <div className="home-countdown-bar-bg">
            <div className="home-countdown-bar-fill" style={{ width: `${pctAno}%` }} />
          </div>
        </div>
      </div>

      {/* Tarefas de hoje */}
      <div className="home-card">
        <div className="home-section-title">TAREFAS DE HOJE</div>
        {!temTarefas ? (
          <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '8px 0' }}>
            Nenhuma tarefa para hoje. Gere sua rotina! 📋
          </p>
        ) : (
          Object.entries(tarefasPorPeriodo).map(([periodo, itens]) => (
            <div key={periodo} style={{ marginBottom: 12 }}>
              <div className="home-periodo-title">{periodo}</div>
              {itens.map(t => (
                <label key={t.id} className={`home-tarefa ${t.concluida ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!t.concluida}
                    onChange={() => toggleTarefa(t)}
                    style={{ accentColor: '#6366f1', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ textDecoration: t.concluida ? 'line-through' : 'none', color: t.concluida ? '#475569' : '#f8fafc' }}>
                    {t.texto}
                  </span>
                </label>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Cards água + peso */}
      <div className="home-cards-row">
        <div className="home-mini-card">
          <div className="home-mini-icon">💧</div>
          <div className="home-mini-info">
            <div className="home-mini-label">ÁGUA HOJE</div>
            <div className="home-mini-val">{aguaHoje.total.toLocaleString('pt-BR')} ml</div>
            <div className="home-mini-bar-bg">
              <div className="home-mini-bar-fill" style={{ width: `${pctAgua}%`, background: pctAgua >= 100 ? '#10b981' : '#3b82f6' }} />
            </div>
            <div className="home-mini-sub">{pctAgua}% da meta ({aguaHoje.meta.toLocaleString('pt-BR')} ml)</div>
          </div>
        </div>
        <div className="home-mini-card">
          <div className="home-mini-icon">⚖️</div>
          <div className="home-mini-info">
            <div className="home-mini-label">PESO HOJE</div>
            <div className="home-mini-val">{pesoHoje ? `${Number(pesoHoje.peso).toFixed(1)} kg` : '—'}</div>
            {diffPeso !== null && (
              <div className="home-mini-sub" style={{ color: Number(diffPeso) < 0 ? '#10b981' : Number(diffPeso) > 0 ? '#ef4444' : '#64748b' }}>
                {Number(diffPeso) > 0 ? '▲' : Number(diffPeso) < 0 ? '▼' : '='} {Math.abs(diffPeso)} kg
              </div>
            )}
            {!pesoHoje && <div className="home-mini-sub">Registre seu peso</div>}
          </div>
        </div>
      </div>

      {/* Refeição atual */}
      <div className="home-card">
        <div className="home-section-title">🥗 REFEIÇÃO ATUAL</div>
        <Dieta user={user} compact={true} />
      </div>

      {/* Suplementos do dia */}
      <div className="home-card">
        <div className="home-section-title">💊 SUPLEMENTOS</div>
        <Suplementos user={user} compact={true} />
      </div>

      {/* Hábitos do dia */}
      <div className="home-card">
        <div className="home-section-title">HÁBITOS DO DIA</div>
        <Habitos user={user} compact={true} />
      </div>

    </div>
  )
}