import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
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

  const [editandoHome, setEditandoHome] = useState(false)
  const [blocos, setBlocos] = useState(() => {
    const saved = localStorage.getItem('home_blocos')
    if (saved) return JSON.parse(saved)
    return [
      { id: 'tarefas',      label: 'Tarefas',      visivel: true },
      { id: 'cards',        label: 'Água + Peso',  visivel: true },
      { id: 'kcal',         label: 'Kcal',         visivel: true },
      { id: 'refeicao',     label: 'Refeição',     visivel: true },
      { id: 'suplementos',  label: 'Suplementos',  visivel: true },
      { id: 'habitos',      label: 'Hábitos',      visivel: true },
    ]
  })

  const hoje = formatarData(new Date())
  const buscarFrase = useCallback(async () => {
      const { data } = await supabase.from('frases').select('texto, autor')
      if (data && data.length > 0) {
        const idx = Math.floor(Math.random() * data.length)
        setFrase(data[idx])
      }
    }, [])

    useEffect(() => { buscarFrase() }, [buscarFrase])

  const carregar = useCallback(async () => {
      const hoje = formatarData(new Date())
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
  }, [user.id])

  useEffect(() => { carregar() }, [carregar])

  function calcularStreak(hist) {
      if (!hist || hist.length === 0) return 1 // hoje conta sempre
      const diasTreino = new Set(hist.map(t => new Date(t.created_at).toLocaleDateString('pt-BR')))
      // Adiciona hoje sempre (entrou no app = ativo hoje)
      diasTreino.add(new Date().toLocaleDateString('pt-BR'))
      let s = 0
      for (let i = 0; i < 60; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        if (diasTreino.has(d.toLocaleDateString('pt-BR'))) s++
        else if (i > 0) break
      }
      return s
    }

  const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    )

    const handleDragEnd = (event) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = blocos.findIndex(b => b.id === active.id)
      const newIndex = blocos.findIndex(b => b.id === over.id)
      const novosBlocos = arrayMove(blocos, oldIndex, newIndex)
      setBlocos(novosBlocos)
      localStorage.setItem('home_blocos', JSON.stringify(novosBlocos))
    }

    const toggleVisivel = (id) => {
      const novosBlocos = blocos.map(b => b.id === id ? { ...b, visivel: !b.visivel } : b)
      setBlocos(novosBlocos)
      localStorage.setItem('home_blocos', JSON.stringify(novosBlocos))
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

      {/* Botão personalizar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditandoHome(!editandoHome)}
                style={{
                  background: editandoHome ? '#6366f1' : 'none',
                  border: '1px solid #ffffff0d',
                  borderRadius: 8, color: editandoHome ? '#fff' : '#64748b',
                  fontSize: 11, padding: '5px 12px', cursor: 'pointer'
                }}
              >
                {editandoHome ? '✓ Concluir' : '✏️ Personalizar'}
              </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocos.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocos.map(bloco => (
                  <BlocoArrastavel
                    key={bloco.id}
                    bloco={bloco}
                    editando={editandoHome}
                    onToggleVisivel={toggleVisivel}
                  >
                    {bloco.id === 'tarefas' && (
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
                                  <input type="checkbox" checked={!!t.concluida} onChange={() => toggleTarefa(t)}
                                    style={{ accentColor: '#6366f1', width: 16, height: 16, flexShrink: 0 }} />
                                  <span style={{ textDecoration: t.concluida ? 'line-through' : 'none', color: t.concluida ? '#475569' : '#f8fafc' }}>
                                    {t.texto}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {bloco.id === 'cards' && (
                      <div className="home-cards-row">
                        <div className="home-mini-card" onClick={() => !editandoHome && onNavegar('agua')} style={{ cursor: 'pointer' }}>
                          <div className="home-mini-icon">💧</div>
                          <div className="home-mini-info">
                            <div className="home-mini-label">ÁGUA HOJE</div>
                            <div className="home-mini-val">{aguaHoje.total.toLocaleString('pt-BR')} ml</div>
                            <div className="home-mini-bar-bg">
                              <div className="home-mini-bar-fill" style={{ width: `${pctAgua}%`, background: pctAgua >= 100 ? '#10b981' : '#3b82f6' }} />
                            </div>
                            <div className="home-mini-sub">{pctAgua}% da meta</div>
                          </div>
                        </div>
                        <div className="home-mini-card" onClick={() => !editandoHome && onNavegar('peso')} style={{ cursor: 'pointer' }}>
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
                    )}

{bloco.id === 'kcal' && (
                <div className="home-cards-row">
                  <div className="home-mini-card" onClick={() => !editandoHome && onNavegar('macros')} style={{ cursor: 'pointer' }}>
                    <div className="home-mini-icon">🔥</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">KCAL HOJE</div>
                      <div className="home-mini-val">{kcalHoje > 0 ? kcalHoje.toLocaleString('pt-BR') : '—'}</div>
                      <div className="home-mini-bar-bg">
                        <div className="home-mini-bar-fill" style={{ width: `${Math.min(100, Math.round((kcalHoje / kcalMeta) * 100))}%`, background: kcalHoje >= kcalMeta ? '#10b981' : '#f59e0b' }} />
                      </div>
                      <div className="home-mini-sub">{Math.min(100, Math.round((kcalHoje / kcalMeta) * 100))}% da meta</div>
                    </div>
                  </div>
                  <div className="home-mini-card" onClick={() => !editandoHome && onNavegar('passos')} style={{ cursor: 'pointer' }}>
                    <div className="home-mini-icon">👟</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">PASSOS HOJE</div>
                      <div className="home-mini-val">{passosHoje ? passosHoje.toLocaleString('pt-BR') : '—'}</div>
                      <div className="home-mini-bar-bg">
                        <div className="home-mini-bar-fill" style={{ width: `${Math.min(100, Math.round(((passosHoje || 0) / passosMeta) * 100))}%`, background: (passosHoje || 0) >= passosMeta ? '#10b981' : '#6366f1' }} />
                      </div>
                      <div className="home-mini-sub">{Math.min(100, Math.round(((passosHoje || 0) / passosMeta) * 100))}% da meta</div>
                    </div>
                  </div>
                </div>
              )}

              {bloco.id === 'passos' && null}
                    {bloco.id === 'refeicao' && (
                      <div className="home-card">
                        <div className="home-section-title">🥗 REFEIÇÃO ATUAL</div>
                        <Dieta user={user} compact={true} />
                      </div>
                    )}

                    {bloco.id === 'suplementos' && (
                      <div className="home-card">
                        <div className="home-section-title">💊 SUPLEMENTOS</div>
                        <Suplementos user={user} compact={true} />
                      </div>
                    )}

                    {bloco.id === 'habitos' && (
                      <div className="home-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarHabitos ? 8 : 0 }}>
                          <div className="home-section-title" style={{ margin: 0 }}>HÁBITOS DO DIA</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => onNavegar('habitos')}
                              style={{ background: 'none', border: '1px solid #ffffff0d', borderRadius: 8, color: '#6366f1', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                              + Personalizar
                            </button>
                            <button onClick={() => { const novo = !mostrarHabitos; setMostrarHabitos(novo); localStorage.setItem('home_mostrar_habitos', String(novo)) }}
                              style={{ background: 'none', border: '1px solid #ffffff0d', borderRadius: 8, color: '#64748b', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                              {mostrarHabitos ? 'Ocultar' : 'Mostrar'}
                            </button>
                          </div>
                        </div>
                        {mostrarHabitos && <Habitos user={user} compact={true} />}
                      </div>
                    )}
                  </BlocoArrastavel>
                ))}
              </SortableContext>
            </DndContext>

          </div>
        )
      }

      function BlocoArrastavel({ bloco, editando, onToggleVisivel, children }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloco.id })
        const style = {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : bloco.visivel ? 1 : 0.3,
        }

        if (!bloco.visivel && !editando) return null

        return (
          <div ref={setNodeRef} style={style}>
            {editando && (
              <div className="home-bloco-edit-bar">
                <span className="home-bloco-drag" {...attributes} {...listeners}>☰</span>
                <span className="home-bloco-label">{bloco.label}</span>
                <button className="home-bloco-toggle" onClick={() => onToggleVisivel(bloco.id)}>
                  {bloco.visivel ? '👁' : '🙈'}
                </button>
              </div>
            )}
            {children}
          </div>
        )
      }
