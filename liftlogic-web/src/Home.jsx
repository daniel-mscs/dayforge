import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Habitos from './Habitos'
import Dieta from './Dieta'
import Suplementos from './Suplementos'



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

export default function Home({ user, onIniciarTreino, treinando, treinoAtivo, divisao, onNavegar }) {
  const [perfil, setPerfil]       = useState(null)
  const [historico, setHistorico] = useState([])
  const [streak, setStreak]       = useState(0)
  const [aguaHoje, setAguaHoje]   = useState({ total: 0, meta: 2500 })
  const [passosHoje, setPassosHoje] = useState(null)
  const [passosMeta, setPassosMeta] = useState(10000)
  const [pesoHoje, setPesoHoje]   = useState(null)
  const [pesoPrev, setPesoPrev]   = useState(null)
  const [rotina, setRotina]       = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [frase, setFrase] = useState(null)
  const [mostrarHabitos, setMostrarHabitos] = useState(() => {
      return localStorage.getItem('home_mostrar_habitos') !== 'false'
    })
  const [kcalHoje, setKcalHoje] = useState(0)
  const [kcalMeta, setKcalMeta] = useState(2000)

  const hoje = formatarData(new Date())
  const buscarFrase = useCallback(async () => {
      const { data } = await supabase.from('frases').select('texto, autor')
      if (data && data.length > 0) {
        const idx = new Date().getDate() % data.length
        setFrase(data[idx])
      }
    }, [])

    useEffect(() => { buscarFrase() }, [buscarFrase])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [
        { data: p },
        { data: h },
        { data: aguaRegs },
        { data: aguaMeta },
        { data: pesoRegs },
        { data: diasData },
        { data: passosData },
        { data: passosMetaData },
        { data: macrosData },
        { data: macrosMetaData },
      ] = await Promise.all([
        supabase.from('perfil').select('*').eq('user_id', user.id).single(),
        supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('agua_registro').select('ml').eq('user_id', user.id).eq('data', hoje),
        supabase.from('agua_meta').select('meta_ml').eq('user_id', user.id).single(),
        supabase.from('peso_registro').select('*').eq('user_id', user.id).order('data', { ascending: false }).limit(2),
        supabase.from('rotina_dias').select('id,data').eq('user_id', user.id).eq('data', hoje).single(),
        supabase.from('passos_registro').select('passos').eq('user_id', user.id).eq('data', hoje).single(),
        supabase.from('passos_meta').select('meta_passos').eq('user_id', user.id).single(),
        supabase.from('macros_registro').select('kcal').eq('user_id', user.id).eq('data', hoje),
        supabase.from('macros_meta').select('meta_kcal').eq('user_id', user.id).single(),
      ])
    if (p) setPerfil(p)
    if (h) { setHistorico(h); setStreak(calcularStreak(h)) }

    const totalAgua = (aguaRegs || []).reduce((s, r) => s + r.ml, 0)
    setAguaHoje({ total: totalAgua, meta: aguaMeta?.meta_ml || 2500 })

    if (passosData) setPassosHoje(passosData.passos)
    if (passosMetaData) setPassosMeta(passosMetaData.meta_passos)
    const totalKcal = (macrosData || []).reduce((s, r) => s + r.kcal, 0)
        setKcalHoje(totalKcal)
        if (macrosMetaData) setKcalMeta(macrosMetaData.meta_kcal)

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

        {/* Banner stats fim de semana */}
        {(() => {
          const dow = new Date().getDay()
          if (dow !== 0 && dow !== 6) return null
          return (
            <div className="home-stats-banner" onClick={() => onNavegar('stats')}>
              <span>📊</span>
              <div>
                <div className="home-stats-banner-title">Resumo da semana disponível!</div>
                <div className="home-stats-banner-sub">Veja onde acertou e onde pode melhorar →</div>
              </div>
            </div>
          )
        })()}

        {/* Frase motivacional */}
        {frase && (
          <div className="home-frase">
            <span>"{frase.texto}"</span>
            {frase.autor && <span className="home-frase-autor">— {frase.autor}</span>}
          </div>
     )}


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
        <div className="home-mini-card" onClick={() => onNavegar('agua')} style={{ cursor: 'pointer' }}>
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
        <div className="home-mini-card" onClick={() => onNavegar('peso')} style={{ cursor: 'pointer' }}>
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

      {/* Card kcal */}
      {kcalHoje > 0 && (
        <div className="home-mini-card" onClick={() => onNavegar('macros')} style={{ cursor: 'pointer' }}>
          <div className="home-mini-icon">🔥</div>
          <div className="home-mini-info">
            <div className="home-mini-label">KCAL HOJE</div>
            <div className="home-mini-val">{kcalHoje.toLocaleString('pt-BR')}</div>
            <div className="home-mini-bar-bg">
              <div className="home-mini-bar-fill" style={{ width: `${Math.min(100, Math.round((kcalHoje / kcalMeta) * 100))}%`, background: kcalHoje >= kcalMeta ? '#10b981' : '#f59e0b' }} />
            </div>
            <div className="home-mini-sub">{Math.min(100, Math.round((kcalHoje / kcalMeta) * 100))}% da meta ({kcalMeta.toLocaleString('pt-BR')} kcal)</div>
          </div>
        </div>
      )}

      {/* Card passos */}
      {passosHoje !== null && (
        <div className="home-mini-card" onClick={() => onNavegar('passos')} style={{ cursor: 'pointer' }}>
          <div className="home-mini-icon">👟</div>
          <div className="home-mini-info">
            <div className="home-mini-label">PASSOS HOJE</div>
            <div className="home-mini-val">{passosHoje.toLocaleString('pt-BR')}</div>
            <div className="home-mini-bar-bg">
              <div className="home-mini-bar-fill" style={{ width: `${Math.min(100, Math.round((passosHoje / passosMeta) * 100))}%`, background: passosHoje >= passosMeta ? '#10b981' : '#6366f1' }} />
            </div>
            <div className="home-mini-sub">{Math.min(100, Math.round((passosHoje / passosMeta) * 100))}% da meta</div>
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarHabitos ? 8 : 0 }}>
          <div className="home-section-title" style={{ margin: 0 }}>HÁBITOS DO DIA</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onNavegar('habitos')}
              style={{ background: 'none', border: '1px solid #ffffff0d', borderRadius: 8, color: '#6366f1', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
            >
              + Personalizar
            </button>
            <button
              onClick={() => {
                const novo = !mostrarHabitos
                setMostrarHabitos(novo)
                localStorage.setItem('home_mostrar_habitos', String(novo))
              }}
              style={{ background: 'none', border: '1px solid #ffffff0d', borderRadius: 8, color: '#64748b', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
            >
              {mostrarHabitos ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        {mostrarHabitos && <Habitos user={user} compact={true} />}
      </div>
      </div>
        )
      }