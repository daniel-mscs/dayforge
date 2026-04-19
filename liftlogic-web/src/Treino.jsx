import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CSS } from '@dnd-kit/utilities'
import './App.css'
import Home from './Home'
import Rotina from './Rotina'
import Habitos from './Habitos'
import Agua from './Agua'
import Peso from './Peso'
import Suplementos from './Suplementos'
import Dieta from './Dieta'
import Macros from './Macros'
import Passos from './Passos'
import Stats from './Stats'
import HomeWP from './HomeWP'
import SmartPocket from './SmartPocket'
import RPG from './RPG'
import { ganharXP } from './lib/rpg'

function ExercicioCard({ ex, concluidos, treinando, toggleConcluido, atualizarExercicio, deletarExercicio }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`card ${concluidos[ex.id] ? 'concluido' : ''}`}>
      <div className="card-header">
        <span className="tag">{ex.grupo_muscular}</span>
        <div className="card-header-actions">
          <span className="drag-handle" {...attributes} {...listeners}>☰</span>
          <button className="btn-delete-mini" onClick={() => deletarExercicio(ex.id)}>×</button>
        </div>
      </div>
      <div className="card-main-row">
        {treinando && (
          <button className="btn-check" onClick={() => toggleConcluido(ex.id)}>
            {concluidos[ex.id] ? '✅' : '⭕'}
          </button>
        )}
        <div className="exercise-details">
          <h3>{ex.nome}</h3>
          <div className="edit-stats-row">
            <input type="number" className="inline-edit" defaultValue={ex.series} onBlur={e => atualizarExercicio(ex.id, 'series', e.target.value)} />
            <span>séries x</span>
            <input type="number" className="inline-edit" defaultValue={ex.repeticoes} onBlur={e => atualizarExercicio(ex.id, 'repeticoes', e.target.value)} />
            <span>reps</span>
          </div>
        </div>
      </div>
      <div className="info">
        <div className="carga-edit">
          <span>{ex.equipamento === 'halter' ? '🏋️' : ex.equipamento === 'barra' ? '🔩' : '⚙️'} Carga:</span>
          <input type="number" className="inline-edit carga-input" defaultValue={ex.carga} onBlur={e => atualizarExercicio(ex.id, 'carga', e.target.value)} />
          <strong>kg</strong>
        </div>
      </div>
    </div>
  )
}

function Treino({ logout, user }) {
    const TREINO_START_KEY = 'liftlogic_treino_inicio'
    const TREINO_ATIVO_KEY = 'liftlogic_treino_ativo'
    const MAX_TREINO_SEG = 5 * 60 * 60
  const [exercicios, setExercicios] = useState([])
  const [divisao, setDivisao] = useState(localStorage.getItem('divisao') || null)
  const [treinoAtivo, setTreinoAtivo] = useState(() => {
    return localStorage.getItem(TREINO_ATIVO_KEY) || 'A'
  })
  const [concluidos, setConcluidos] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [abaPrincipal, setAbaPrincipal] = useState('home')
  const [perfilCompleto, setPerfilCompleto] = useState(true)
  const [historico, setHistorico] = useState([])
  const [modalResumo, setModalResumo] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [subAbaTreino, setSubAbaTreino] = useState('exercicios')
  const [subAbaPerfil, setSubAbaPerfil] = useState('perfil')
  const [ajudaAncora, setAjudaAncora] = useState(null)


  const [treinando, setTreinando] = useState(() => {
    const salvo = localStorage.getItem(TREINO_START_KEY)
    if (!salvo) return false
    const elapsed = Math.floor((Date.now() - Number(salvo)) / 1000)
    return elapsed < MAX_TREINO_SEG
  })

  const [tempoTotal, setTempoTotal] = useState(() => {
    const salvo = localStorage.getItem(TREINO_START_KEY)
    if (!salvo) return 0
    const elapsed = Math.floor((Date.now() - Number(salvo)) / 1000)
    return elapsed < MAX_TREINO_SEG ? elapsed : 0
  })
  const [descanso, setDescanso] = useState(0)
  const [inputDescanso, setInputDescanso] = useState('')

  const [perfil, setPerfil] = useState({ nome: '', peso: '', altura: '', idade: '', sexo: 'M' })
  const [perfilEditado, setPerfilEditado] = useState(false)
  const [perfilOriginal, setPerfilOriginal] = useState(null)
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [perfilMsg, setPerfilMsg] = useState('')
  const [dashData, setDashData] = useState({ historico: [], exercicioSelecionado: null, evolucao: [] })
  const [cardioRegistros, setCardioRegistros] = useState([])
  const [cardioForm, setCardioForm] = useState({ tipo: 'Corrida', duracao: '', kcal: '', observacao: '' })
  const timerRef = useRef(null)
  const descansoRef = useRef(null)
  const alertaAtivoRef = useRef(false)
  const inicioTreinoRef = useRef(
    localStorage.getItem(TREINO_START_KEY) ? Number(localStorage.getItem(TREINO_START_KEY)) : null
  )
  const inicioDescansoRef = useRef(null)
  const duracaoDescansoRef = useRef(0)
  const audioRef = useRef(new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.wav'))

  const [novoExercicio, setNovoExercicio] = useState({
    nome: '', series: '', repeticoes: '', carga: '', grupo_muscular: '', treino: 'A', equipamento: 'maquina'
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const tocarAlertaLongo = () => {
    if (alertaAtivoRef.current) return
    alertaAtivoRef.current = true
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    let repeticoes = 0
    const intervaloSom = setInterval(() => {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      repeticoes++
      if (repeticoes >= 3) {
        clearInterval(intervaloSom)
        setTimeout(() => { alertaAtivoRef.current = false }, 1000)
      }
    }, 600)
  }

  const buscarExercicios = async () => {
    setCarregando(true)
    const { data, error } = await supabase.from('exercicio').select('*').eq('user_id', user.id).order('ordem', { ascending: true })
    if (error) console.error('Erro:', error.message)
    else setExercicios(data || [])
    setCarregando(false)
  }

  const buscarHistorico = async () => {
    const { data, error } = await supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) console.error('Erro:', error.message)
    else setHistorico(data || [])
  }

  const buscarPerfil = async () => {
      const { data, error } = await supabase.from('perfil').select('*').eq('user_id', user.id).single()
      if (error && error.code !== 'PGRST116') console.error('Erro perfil:', error.message)
      if (data) {
        const p = { nome: data.nome || '', peso: data.peso || '', altura: data.altura || '', idade: data.idade || '', sexo: data.sexo || 'M' }
        setPerfil(p)
        setPerfilOriginal(p)
        setPerfilEditado(false)
        const completo = !!(data.nome && data.peso && data.altura && data.idade && data.sexo)
        setPerfilCompleto(completo)
        if (!completo) {
          setAbaPrincipal('perfil')
          setPerfilEditado(true)
        }
      } else {
        // Usuário novo sem perfil
        setPerfilCompleto(false)
        setAbaPrincipal('perfil')
        setPerfilEditado(true)
      }
    }

  const salvarPerfil = async (e) => {
    e.preventDefault()
    setSalvandoPerfil(true)
    setPerfilMsg('')
    const payload = {
      user_id: user.id,
      nome: perfil.nome,
      peso: Number(perfil.peso),
      altura: Number(perfil.altura),
      idade: Number(perfil.idade),
      sexo: perfil.sexo,
    }
    const { error } = await supabase.from('perfil').upsert(payload, { onConflict: 'user_id' })
    if (error) setPerfilMsg('Erro ao salvar: ' + error.message)
        else {
          setPerfilMsg('Perfil salvo com sucesso! ✅')
          setPerfilCompleto(true)
          setPerfilOriginal(perfil)
          setPerfilEditado(false)
        }
    setSalvandoPerfil(false)
    setTimeout(() => setPerfilMsg(''), 3000)
  }

const buscarCardio = async () => {
    const hoje = new Date()
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    const { data } = await supabase.from('cardio_registro').select('*').eq('user_id', user.id).gte('data', inicio).order('created_at', { ascending: false })
    setCardioRegistros(data || [])
  }

const buscarDashboard = async () => {
    const { data } = await supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    const filtrado = (data || []).filter(t => t.created_at !== null)
    setDashData(prev => ({ ...prev, historico: filtrado }))
  }

  const buscarEvolucao = async (nomeExercicio) => {
    const { data } = await supabase
      .from('historico_carga')
      .select('carga, created_at')
      .eq('user_id', user.id)
      .eq('exercicio_nome', nomeExercicio)
      .order('created_at', { ascending: true })
    setDashData(prev => ({ ...prev, evolucao: data || [], exercicioSelecionado: nomeExercicio }))
  }

  const calcularIMC = () => {
    if (!perfil.peso || !perfil.altura) return null
    const alturaM = Number(perfil.altura) / 100
    return (Number(perfil.peso) / (alturaM * alturaM)).toFixed(1)
  }

  const classificarIMC = (imc) => {
    if (imc < 18.5) return { label: 'Abaixo do peso', color: '#fbbf24' }
    if (imc < 25) return { label: 'Peso normal', color: '#10b981' }
    if (imc < 30) return { label: 'Sobrepeso', color: '#f97316' }
    return { label: 'Obesidade', color: '#ef4444' }
  }

  const calcularTMB = () => {
    if (!perfil.peso || !perfil.altura || !perfil.idade || !perfil.sexo) return null
    if (perfil.sexo === 'M') return Math.round(88.36 + (13.4 * Number(perfil.peso)) + (4.8 * Number(perfil.altura)) - (5.7 * Number(perfil.idade)))
    return Math.round(447.6 + (9.2 * Number(perfil.peso)) + (3.1 * Number(perfil.altura)) - (4.3 * Number(perfil.idade)))
  }

  useEffect(() => { buscarExercicios(); buscarPerfil() }, [])
  useEffect(() => { if (divisao) localStorage.setItem('divisao', divisao) }, [divisao])
  useEffect(() => { if (abaPrincipal === 'historico') buscarHistorico() }, [abaPrincipal])
  useEffect(() => { if (abaPrincipal === 'perfil') buscarPerfil() }, [abaPrincipal])
  useEffect(() => { if (abaPrincipal === 'dashboard') buscarDashboard() }, [abaPrincipal])

  useEffect(() => {
    if (treinando) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - inicioTreinoRef.current) / 1000)
        if (elapsed >= MAX_TREINO_SEG) {
          clearInterval(timerRef.current)
          localStorage.removeItem(TREINO_START_KEY)
          localStorage.removeItem(TREINO_ATIVO_KEY)
          setTreinando(false)
          setTempoTotal(MAX_TREINO_SEG)
          return
        }
        setTempoTotal(elapsed)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [treinando])

  const iniciarTimerDescanso = (segundos) => {
    clearInterval(descansoRef.current)
    descansoRef.current = null
    inicioDescansoRef.current = Date.now()
    duracaoDescansoRef.current = segundos
    setDescanso(segundos)
    descansoRef.current = setInterval(() => {
      const restante = duracaoDescansoRef.current - Math.floor((Date.now() - inicioDescansoRef.current) / 1000)
      if (restante <= 0) {
        clearInterval(descansoRef.current)
        descansoRef.current = null
        inicioDescansoRef.current = null
        duracaoDescansoRef.current = 0
        setDescanso(0)
        tocarAlertaLongo()
      } else {
        setDescanso(restante)
      }
    }, 1000)
  }

  const adicionarDescanso = (segundos) => {
    const atual = duracaoDescansoRef.current > 0
      ? duracaoDescansoRef.current - Math.floor((Date.now() - inicioDescansoRef.current) / 1000)
      : 0
    iniciarTimerDescanso(Math.max(0, atual) + segundos)
  }

  const iniciarDescansoManual = () => {
    const segundos = parseInt(inputDescanso, 10)
    if (!Number.isFinite(segundos) || segundos <= 0) return
    iniciarTimerDescanso(segundos)
    setInputDescanso('')
  }

  const cancelarDescanso = () => {
    clearInterval(descansoRef.current)
    descansoRef.current = null
    inicioDescansoRef.current = null
    duracaoDescansoRef.current = 0
    setDescanso(0)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)
    const outrosExercicios = exercicios.filter(ex => ex.treino !== treinoAtivo)
    const oldIndex = exerciciosFiltrados.findIndex(ex => ex.id === active.id)
    const newIndex = exerciciosFiltrados.findIndex(ex => ex.id === over.id)
    const novaOrdem = arrayMove(exerciciosFiltrados, oldIndex, newIndex)
    setExercicios([...outrosExercicios, ...novaOrdem])
    const updates = novaOrdem.map((ex, index) =>
      supabase.from('exercicio').update({ ordem: index }).eq('id', ex.id).eq('user_id', user.id)
    )
    await Promise.all(updates)
  }

  const finalizarTreino = () => {
      const treinoIniciado = localStorage.getItem(TREINO_ATIVO_KEY) || treinoAtivo
      const filtrados = exercicios.filter(ex => ex.treino === treinoIniciado)
    const volumeTotal = filtrados.reduce((acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0)
    const concluídosCount = Object.values(concluidos).filter(Boolean).length
    const kcal = perfil.peso ? Math.round(5.0 * Number(perfil.peso) * (tempoTotal / 3600)) : null
    const maisHeavy = filtrados.reduce((max, ex) => Number(ex.carga) > Number(max?.carga || 0) ? ex : max, null)
    setModalResumo({ volumeTotal, concluídosCount, total: filtrados.length, kcal, maisHeavy, treinoIniciado })
  }

    const confirmarFinalizarTreino = async () => {
        const treinoIniciado = localStorage.getItem(TREINO_ATIVO_KEY) || treinoAtivo
        localStorage.removeItem(TREINO_START_KEY)
        localStorage.removeItem(TREINO_ATIVO_KEY)
        const filtrados = exercicios.filter(ex => ex.treino === treinoIniciado)
        const volumeTotal = filtrados.reduce((acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0)
        const { data, error } = await supabase.from('treinos_finalizados').insert([{
          treino: treinoIniciado, tempo_segundos: tempoTotal, volume_total: volumeTotal, kcal: modalResumo.kcal || 0, user_id: user.id
    }]).select()
    if (error) { alert('Erro ao salvar: ' + error.message); return }
    const registrosCarga = filtrados.map(ex => ({
      user_id: user.id,
      exercicio_nome: ex.nome,
      carga: Number(ex.carga),
      treino: treinoAtivo,
    }))
    await supabase.from('historico_carga').insert(registrosCarga)
    setModalResumo(null)
    setTreinando(false)
    setTempoTotal(0)
    cancelarDescanso()
    setConcluidos({})
    if (data) setHistorico(prev => [data[0], ...prev])
        await ganharXP(user.id, 'treino_finalizado')
      }

      const salvarExercicio = async (e) => {
    e.preventDefault()
    setCarregando(true)
    const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)
    const { error } = await supabase.from('exercicio').insert([{
      nome: novoExercicio.nome, grupo_muscular: novoExercicio.grupo_muscular,
      series: Number(novoExercicio.series), repeticoes: Number(novoExercicio.repeticoes),
      carga: Number(novoExercicio.carga), treino: treinoAtivo, user_id: user.id,
      ordem: exerciciosFiltrados.length,
      equipamento: novoExercicio.equipamento,
    }])
    if (error) alert(error.message)
    else { buscarExercicios(); setNovoExercicio({ nome: '', series: '', repeticoes: '', carga: '', grupo_muscular: '', treino: treinoAtivo, equipamento: 'maquina' }) }
    setCarregando(false)
  }

  const atualizarExercicio = async (id, campo, valor) => {
    const valorFinal = ['carga', 'series', 'repeticoes'].includes(campo) ? Number(valor) : valor
    const { error } = await supabase.from('exercicio').update({ [campo]: valorFinal }).eq('id', id).eq('user_id', user.id)
    if (error) console.error(error.message)
    else buscarExercicios()
  }

  const deletarExercicio = async (id) => {
    const { error } = await supabase.from('exercicio').delete().eq('id', id).eq('user_id', user.id)
    if (error) alert(error.message)
    else buscarExercicios()
  }

  const toggleConcluido = id => setConcluidos(prev => ({ ...prev, [id]: !prev[id] }))
  const abrirAjuda = (ancora) => {
      setAjudaAncora(ancora)
      setAbaPrincipal('perfil')
      setSubAbaPerfil('ajuda')
    }

  const formatarTempo = segundos => {
    const s = Number(segundos || 0)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  // removido — seleção de divisão agora fica dentro da aba treino

  const abasDisponiveis = divisao ? divisao.split('') : []
  const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)
  const imc = calcularIMC()
  const tmb = calcularTMB()

  return (
    <div className="container">
      {modalResumo && (
        <div className="modal-overlay">
          <div className="modal-resumo">
            <h2>🏁 Resumo do Treino {modalResumo.treinoIniciado || treinoAtivo}</h2>
            <div className="stats-grid">
              <div className="stat-card"><span>TEMPO</span><strong>{formatarTempo(tempoTotal)}</strong></div>
              <div className="stat-card"><span>EXERCÍCIOS</span><strong>{modalResumo.concluídosCount}/{modalResumo.total}</strong><small>concluídos</small></div>
              {modalResumo.kcal && <div className="stat-card"><span>KCAL</span><strong>{modalResumo.kcal}</strong><small>estimado</small></div>}
              {modalResumo.maisHeavy && <div className="stat-card"><span>+ PESADO</span><strong>{modalResumo.maisHeavy.carga} kg</strong><small>{modalResumo.maisHeavy.nome}</small></div>}
            </div>
            <div className="modal-actions">
              <button className="btn-stop-workout" onClick={confirmarFinalizarTreino}>💾 Salvar Treino</button>
              <button className="btn-cancel-rest" onClick={() => setModalResumo(null)}>Continuar Treinando</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`bottom-nav-btn ${abaPrincipal === 'home' ? 'active' : ''}`} onClick={() => setAbaPrincipal('home')}>
          <span>🏠</span><span>Home</span>
        </button>
        <button className={`bottom-nav-btn ${abaPrincipal === 'treino' ? 'active' : ''}`} onClick={() => setAbaPrincipal('treino')}>
          <span>🏋️</span><span>Treino</span>
        </button>
        <button className={`bottom-nav-btn ${abaPrincipal === 'rotina' ? 'active' : ''}`} onClick={() => setAbaPrincipal('rotina')}>
          <span>📋</span><span>Rotina</span>
        </button>
        <div className="bottom-nav-more-wrap">
          <button className={`bottom-nav-btn ${['agua','peso','suplementos','dieta','macros','historico','dashboard'].includes(abaPrincipal) ? 'active' : ''}`} onClick={() => setShowMore(p => !p)}>
            <span>🗃️</span><span>Mais</span>
          </button>
          {showMore && (
            <div className="bottom-nav-more-menu">
              {[
                { id: 'habitos', icon: '✅', label: 'Hábitos'         },
                { id: 'agua',        icon: '💧', label: 'Água'        },
                { id: 'peso',        icon: '⚖️', label: 'Peso'        },
                { id: 'dieta',       icon: '🥗', label: 'Dieta'       },
                { id: 'suplementos', icon: '💊', label: 'Suplementos' },
                { id: 'macros',      icon: '🍽️', label: 'Macros'      },
                { id: 'passos', icon: '👟', label: 'Passos' },
                { id: 'stats', icon: '📊', label: 'Stats' },
                { id: 'smartpocket', icon: '💰', label: 'SmartPocket' },
                { id: 'rpg', icon: '⚔️', label: 'RPG' },

              ].map(item => (
                <button key={item.id} className={`more-menu-item ${abaPrincipal === item.id ? 'active' : ''}`}
                  onClick={() => { setAbaPrincipal(item.id); setShowMore(false) }}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </button>
              ))}
              <button className="more-menu-item more-menu-logout" onClick={logout}>
                <span>🚪</span><span>Sair</span>
              </button>
            </div>
          )}
        </div>
        <button className={`bottom-nav-btn ${abaPrincipal === 'perfil' ? 'active' : ''}`} onClick={() => setAbaPrincipal('perfil')}>
          <span>👤</span><span>Perfil</span>
        </button>
      </nav>

      {/* Overlay pra fechar o menu */}
      {showMore && <div className="bottom-nav-overlay" onClick={() => setShowMore(false)} />}

        {abaPrincipal === 'home' && (
          <Home
            user={user}
            onIniciarTreino={() => setAbaPrincipal('treino')}
            treinando={treinando}
            treinoAtivo={treinoAtivo}
            divisao={divisao}
            onNavegar={setAbaPrincipal}
          />
        )}

      {abaPrincipal === 'rotina' && (
            <Rotina user={user} />
      )}

      {abaPrincipal === 'habitos' && (
        <Habitos user={user} />
      )}

      {abaPrincipal === 'agua' && (
        <Agua user={user} onAjuda={abrirAjuda} />
      )}

      {abaPrincipal === 'peso' && (
        <Peso user={user} onAjuda={abrirAjuda} />
      )}

  {abaPrincipal === 'suplementos' && (
    <Suplementos user={user} onAjuda={abrirAjuda} />
  )}
    {abaPrincipal === 'dieta' && (
      <Dieta user={user} onAjuda={abrirAjuda} />
    )}

    {abaPrincipal === 'macros' && (
      <Macros user={user} onAjuda={abrirAjuda} />
    )}

    {abaPrincipal === 'passos' && (
      <Passos user={user} onAjuda={abrirAjuda} />
    )}

    {abaPrincipal === 'stats' && (
      <Stats user={user} />
    )}

    {abaPrincipal === 'smartpocket' &&
        <SmartPocket user={user} />}

    {abaPrincipal === 'rpg' && <RPG user={user} />}

    {abaPrincipal === 'treino' && (
      <>
        {/* Sub-nav do treino */}
        <div className="treino-subnav">
          <button
            className={subAbaTreino === 'exercicios' ? 'treino-subnav-btn active' : 'treino-subnav-btn'}
            onClick={() => setSubAbaTreino('exercicios')}
          >🏋️ Exercícios</button>
          <button
            className={subAbaTreino === 'stats' ? 'treino-subnav-btn active' : 'treino-subnav-btn'}
            onClick={() => { setSubAbaTreino('stats'); buscarDashboard() }}
          >📊 Stats</button>
          <button
                      className={subAbaTreino === 'historico' ? 'treino-subnav-btn active' : 'treino-subnav-btn'}
                      onClick={() => { setSubAbaTreino('historico'); buscarHistorico() }}
                    >📜 Histórico</button>
                    <button
                      className={subAbaTreino === 'cardio' ? 'treino-subnav-btn active' : 'treino-subnav-btn'}
                      onClick={() => { setSubAbaTreino('cardio'); buscarCardio() }}
                    >🏃 Cardio</button>
        </div>

        {/* Exercícios */}
        {subAbaTreino === 'exercicios' && (
          <>
            {!divisao ? (
                          <div className="selection-screen" style={{ padding: '20px 0' }}>
                            <p className="subtitle">Escolha sua divisão de treino:</p>
                            <div className="selection-grid">
                              {['AB', 'ABC', 'ABCD', 'ABCDE'].map(op => (
                                <button key={op} onClick={() => { setDivisao(op); setTreinoAtivo('A') }} className="select-btn">{op}</button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <header className="header-app">
                            <button className="back-btn" onClick={() => { localStorage.removeItem('divisao'); setDivisao(null) }}>← Trocar Divisão</button>
                          </header>
                        )}

            {divisao && <>
            <div className="timer-section">
              {!treinando ? (
                <button className="btn-start-workout" onClick={() => {
                  const agora = Date.now()
                  localStorage.setItem(TREINO_START_KEY, agora)
                  localStorage.setItem(TREINO_ATIVO_KEY, treinoAtivo)
                  inicioTreinoRef.current = agora
                  setTreinando(true)
                  setTempoTotal(0)
                }}>▶ Iniciar Treino {treinoAtivo}</button>
              ) : (
                <div className="active-timer-container">
                  <div className="main-timer">
                    <span>TEMPO DE TREINO</span>
                    <strong>{formatarTempo(tempoTotal)}</strong>
                  </div>
                  <div className={`rest-timer ${descanso > 0 ? 'active' : ''}`}>
                    <span>DESCANSO</span>
                    <strong>{formatarTempo(descanso)}</strong>
                    <div className="quick-rest-buttons">
                      <button className="btn-quick-rest" onClick={() => adicionarDescanso(30)}>+30s</button>
                      <button className="btn-quick-rest" onClick={() => adicionarDescanso(60)}>+60s</button>
                      <button className="btn-quick-rest" onClick={() => adicionarDescanso(90)}>+90s</button>
                    </div>
                    <div className="custom-rest-input">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Tempo manual (seg)"
                        value={inputDescanso}
                        onChange={e => setInputDescanso(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') iniciarDescansoManual() }}
                      />
                      <div className="rest-actions">
                        <button type="button" className="btn-play-rest" onClick={iniciarDescansoManual}>▶</button>
                        <button type="button" className="btn-cancel-rest" onClick={cancelarDescanso} disabled={descanso === 0}>✕</button>
                      </div>
                    </div>
                  </div>
                  <button className="btn-stop-workout" onClick={finalizarTreino}>Finalizar Treino</button>
                </div>
              )}
            </div>

            <h1 className="title-divisao">Treino {divisao}</h1>
            <div className="tabs">
              {abasDisponiveis.map(letra => (
                <button key={letra} className={treinoAtivo === letra ? 'tab-button active' : 'tab-button'} onClick={() => setTreinoAtivo(letra)}>{letra}</button>
              ))}
            </div>

            {!treinando && (
              <form className="form-cadastro" onSubmit={salvarExercicio}>
                <input type="text" placeholder="Nome do Exercício (ex: Supino Reto)" value={novoExercicio.nome} onChange={e => setNovoExercicio({ ...novoExercicio, nome: e.target.value })} required />
                <input type="text" placeholder="Grupo Muscular (ex: Peitoral)" value={novoExercicio.grupo_muscular} onChange={e => setNovoExercicio({ ...novoExercicio, grupo_muscular: e.target.value })} required />
                <div className="sexo-selector">
                  <button type="button" className={novoExercicio.equipamento === 'halter' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setNovoExercicio({ ...novoExercicio, equipamento: 'halter' })}>🏋️ Halter</button>
                  <button type="button" className={novoExercicio.equipamento === 'barra' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setNovoExercicio({ ...novoExercicio, equipamento: 'barra' })}>🔩 Barra</button>
                  <button type="button" className={novoExercicio.equipamento === 'maquina' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setNovoExercicio({ ...novoExercicio, equipamento: 'maquina' })}>⚙️ Máquina</button>
                </div>
                <div className="row">
                  <input type="number" placeholder="Séries" value={novoExercicio.series} onChange={e => setNovoExercicio({ ...novoExercicio, series: e.target.value })} required />
                  <input type="number" placeholder="Reps" value={novoExercicio.repeticoes} onChange={e => setNovoExercicio({ ...novoExercicio, repeticoes: e.target.value })} required />
                  <input type="number" placeholder="Kg" value={novoExercicio.carga} onChange={e => setNovoExercicio({ ...novoExercicio, carga: e.target.value })} required />
                </div>
                <button type="submit" disabled={carregando}>{carregando ? 'Salvando...' : `+ Adicionar ao Treino ${treinoAtivo}`}</button>
              </form>
            )}

            <div className="lista-exercicios">
              {carregando && <p className="empty-msg">Forjando seu treino... 🧱</p>}
              {!carregando && exerciciosFiltrados.length === 0 && (
                <p className="empty-msg">Nenhum exercício no Treino {treinoAtivo}. Adicione um! 💪</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={exerciciosFiltrados.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
                  {exerciciosFiltrados.map(ex => (
                    <ExercicioCard key={ex.id} ex={ex} concluidos={concluidos} treinando={treinando} toggleConcluido={toggleConcluido} atualizarExercicio={atualizarExercicio} deletarExercicio={deletarExercicio} />
                  ))}
                </SortableContext>
              </DndContext>
                          </div>
                          </>}
                        </>
        )}

        {/* Stats */}
        {subAbaTreino === 'stats' && (
          <div className="dashboard-section">
            <div className="dash-card">
              <h3 className="dash-title">🔥 Kcal por Treino</h3>
              {dashData.historico.length === 0 ? <p className="empty-msg">Nenhum treino ainda.</p> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dashData.historico.slice(-10).map(t => ({ name: `${t.treino} ${new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, kcal: t.kcal || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc' }} />
                    <Bar dataKey="kcal" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="dash-card">
              <h3 className="dash-title">📦 Volume por Treino</h3>
              {dashData.historico.length === 0 ? <p className="empty-msg">Nenhum treino ainda.</p> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dashData.historico.slice(-10).map(t => ({ name: `${t.treino} ${new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, volume: t.volume_total || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc' }} />
                    <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="dash-card">
              <h3 className="dash-title">📈 Evolução de Carga</h3>
              <select className="dash-select" onChange={e => buscarEvolucao(e.target.value)} defaultValue="">
                <option value="" disabled>Selecione um exercício</option>
                {[...new Set(exercicios.map(ex => ex.nome))].map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
              {dashData.evolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dashData.evolucao.map((ex, i) => ({ name: `#${i + 1}`, carga: ex.carga }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc' }} />
                    <Line type="monotone" dataKey="carga" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-msg" style={{ marginTop: 16 }}>Selecione um exercício acima 👆</p>
              )}
            </div>
            <div className="dash-card">
              <h3 className="dash-title">⏱️ Tempo por Treino</h3>
              {dashData.historico.length === 0 ? <p className="empty-msg">Nenhum treino ainda.</p> : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dashData.historico.slice(-10).map(t => ({ name: `${t.treino} ${new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, minutos: Math.round((t.tempo_segundos || 0) / 60) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc' }} formatter={(v) => [`${v} min`]} />
                    <Line type="monotone" dataKey="minutos" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

    {/* Cardio */}
            {subAbaTreino === 'cardio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 80 }}>
                <h2 className="title-divisao">🏃 Cardio</h2>

                {/* Formulário */}
                <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 18 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 14 }}>REGISTRAR CARDIO</div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>TIPO</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Corrida', 'Caminhada', 'Bike', 'Natação', 'Pular Corda', 'Elíptico', 'Esteira', 'HIIT', 'Outro'].map(t => (
                        <button key={t} onClick={() => setCardioForm(p => ({ ...p, tipo: t }))} style={{
                          background: cardioForm.tipo === t ? '#6366f1' : '#24282d',
                          border: `1px solid ${cardioForm.tipo === t ? '#6366f1' : '#ffffff0d'}`,
                          borderRadius: 8, color: cardioForm.tipo === t ? '#fff' : '#64748b',
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer'
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>DURAÇÃO (min)</div>
                      <input type="number" placeholder="Ex: 30" value={cardioForm.duracao}
                        onChange={e => setCardioForm(p => ({ ...p, duracao: e.target.value }))}
                        style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>KCAL (opcional)</div>
                      <input type="number" placeholder="Ex: 300" value={cardioForm.kcal}
                        onChange={e => setCardioForm(p => ({ ...p, kcal: e.target.value }))}
                        style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>OBSERVAÇÃO (opcional)</div>
                    <input type="text" placeholder="Ex: 5km no parque" value={cardioForm.observacao}
                      onChange={e => setCardioForm(p => ({ ...p, observacao: e.target.value }))}
                      style={{ width: '100%' }} />
                  </div>

                  <button onClick={async () => {
                    if (!cardioForm.duracao) { alert('Informe a duração!'); return }
                    const hoje = new Date()
                    const offset = hoje.getTimezoneOffset()
                    const data = new Date(hoje.getTime() - offset * 60000).toISOString().split('T')[0]
                    const kcalEstimado = cardioForm.kcal ? parseInt(cardioForm.kcal) : Math.round(parseInt(cardioForm.duracao) * 7)
                    const { data: novo, error } = await supabase.from('cardio_registro').insert([{
                      user_id: user.id, data, tipo: cardioForm.tipo,
                      duracao_min: parseInt(cardioForm.duracao),
                      kcal: kcalEstimado,
                      observacao: cardioForm.observacao || null
                    }]).select()
                    if (error) { alert(error.message); return }
                    setCardioRegistros(prev => [novo[0], ...prev])
                    setCardioForm(p => ({ ...p, duracao: '', kcal: '', observacao: '' }))
                    await ganharXP(user.id, 'treino_finalizado')
                  }} style={{
                    width: '100%', background: '#6366f1', border: 'none', borderRadius: 10,
                    color: '#fff', fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer'
                  }}>+ Registrar Cardio</button>
                </div>

                {/* Resumo do mês */}
                {cardioRegistros.length > 0 && (() => {
                  const totalMin = cardioRegistros.reduce((s, r) => s + r.duracao_min, 0)
                  const totalKcal = cardioRegistros.reduce((s, r) => s + (r.kcal || 0), 0)
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'SESSÕES', val: cardioRegistros.length, color: '#6366f1' },
                        { label: 'MINUTOS', val: totalMin, color: '#10b981' },
                        { label: 'KCAL', val: totalKcal, color: '#f59e0b' },
                      ].map((c, i) => (
                        <div key={i} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em' }}>{c.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.val}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Lista */}
                {cardioRegistros.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Nenhum cardio registrado este mês. Bora se mover! 🏃</p>
                ) : cardioRegistros.map(r => (
                  <div key={r.id} style={{
                    background: '#1a1d21', border: '1px solid #ffffff0d',
                    borderLeft: '3px solid #10b981', borderRadius: 12, padding: '12px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>🏃 {r.tipo}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {r.duracao_min} min · {r.kcal} kcal
                        {r.observacao ? ` · ${r.observacao}` : ''}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                        {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <button onClick={async () => {
                      await supabase.from('cardio_registro').delete().eq('id', r.id)
                      setCardioRegistros(prev => prev.filter(x => x.id !== r.id))
                    }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

        {/* Histórico */}
        {subAbaTreino === 'historico' && (
          <div className="historico-section">
            <h1 className="title-divisao">Histórico 📜</h1>
            {historico.length === 0 ? (
              <p className="empty-msg">Nenhum treino registrado ainda. Bora treinar! 💪</p>
            ) : (
              historico.map(t => (
                <div key={t.id} className="card-historico">
                  <div className="hist-header">
                    <span className="hist-tag">Treino {t.treino || '—'}</span>
                    <span className="hist-date">{t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="hist-stats">
                    <div className="hist-stat-item"><span>TEMPO</span><strong>{formatarTempo(t.tempo_segundos)}</strong></div>
                    <div className="hist-stat-item"><span>🔥 KCAL</span><strong>{t.kcal || '—'}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </>

        )}{abaPrincipal === 'perfil' && (
        <div className="perfil-section">

          {/* Sub-nav perfil */}
          <div className="treino-subnav" style={{ marginBottom: 20 }}>
            <button className={subAbaPerfil === 'perfil' ? 'treino-subnav-btn active' : 'treino-subnav-btn'} onClick={() => setSubAbaPerfil('perfil')}>👤 Perfil</button>
            <button className={subAbaPerfil === 'ajuda' ? 'treino-subnav-btn active' : 'treino-subnav-btn'} onClick={() => setSubAbaPerfil('ajuda')}>❓ Ajuda</button>
          </div>

          {/* Perfil */}
          {subAbaPerfil === 'perfil' && (
            <>
              {!perfilCompleto && (
                                <div style={{ background: '#6366f115', border: '1px solid #6366f144', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#818cf8' }}>
                                  👋 Bem-vindo ao DayForge! Complete seu perfil para começar.
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <h1 className="title-divisao" style={{ margin: 0 }}>Meu Perfil 👤</h1>
                {!perfilEditado && perfilOriginal && (
                  <button className="peso-btn-alterar" onClick={() => setPerfilEditado(true)}>Alterar</button>
                )}
              </div>
              <form className="form-cadastro" onSubmit={salvarPerfil}>
                <input type="text" placeholder="Seu nome" value={perfil.nome} onChange={e => { setPerfil({ ...perfil, nome: e.target.value }); setPerfilEditado(true) }} disabled={!perfilEditado} style={{ opacity: perfilEditado ? 1 : 0.6 }} />
                <div className="row">
                  <input type="number" placeholder="Peso (kg)" value={perfil.peso} onChange={e => { setPerfil({ ...perfil, peso: e.target.value }); setPerfilEditado(true) }} disabled={!perfilEditado} style={{ opacity: perfilEditado ? 1 : 0.6 }} />
                  <input type="number" placeholder="Altura (cm)" value={perfil.altura} onChange={e => { setPerfil({ ...perfil, altura: e.target.value }); setPerfilEditado(true) }} disabled={!perfilEditado} style={{ opacity: perfilEditado ? 1 : 0.6 }} />
                  <input type="number" placeholder="Idade" value={perfil.idade} onChange={e => { setPerfil({ ...perfil, idade: e.target.value }); setPerfilEditado(true) }} disabled={!perfilEditado} style={{ opacity: perfilEditado ? 1 : 0.6 }} />
                </div>
                {perfilEditado ? (
                        <div className="sexo-selector">
                          <button type="button" className={perfil.sexo === 'M' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setPerfil({ ...perfil, sexo: 'M' })}>♂ Masculino</button>
                          <button type="button" className={perfil.sexo === 'F' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setPerfil({ ...perfil, sexo: 'F' })}>♀ Feminino</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#64748b', padding: '4px 0' }}>
                          {perfil.sexo === 'M' ? '♂ Masculino' : '♀ Feminino'}
                        </div>
                      )}
                {perfilEditado && (
                  <button type="submit" disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando...' : 'Salvar Perfil'}</button>
                )}
                {perfilMsg && <p className={perfilMsg.includes('Erro') ? 'auth-erro' : 'auth-sucesso'}>{perfilMsg}</p>}
              </form>
              {(imc || tmb) && (
                <div className="stats-grid">
                  {imc && <div className="stat-card"><span>IMC</span><strong style={{ color: classificarIMC(imc).color }}>{imc}</strong><small>{classificarIMC(imc).label}</small></div>}
                  {tmb && <div className="stat-card"><span>TMB</span><strong>{tmb}</strong><small>kcal/dia em repouso</small></div>}
                  {perfil.peso && perfil.altura && <div className="stat-card"><span>PESO</span><strong>{perfil.peso} kg</strong><small>{perfil.altura} cm</small></div>}
                  {perfil.idade && <div className="stat-card"><span>IDADE</span><strong>{perfil.idade}</strong><small>anos</small></div>}
                </div>
              )}
              <button className="nav-btn-logout" style={{ marginTop: 24, width: '100%', padding: 14, borderRadius: 10, border: '1px solid #ef444433', background: '#3a1a1a', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }} onClick={logout}>🚪 Sair da conta</button>
            </>
          )}
          {/* Ajuda */}
          {subAbaPerfil === 'ajuda' && (
                      <div className="ajuda-section" ref={el => {
                        if (el && ajudaAncora) {
                          setTimeout(() => {
                            const target = document.getElementById(ajudaAncora)
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            setAjudaAncora(null)
                          }, 100)
                        }
                      }}>
                        <h1 className="title-divisao">❓ Ajuda & Saúde</h1>

              <div id="ajuda-geral" className="ajuda-group-title">📱 Como usar o app</div>
              <div className="ajuda-item"><div className="ajuda-num">1</div><div className="ajuda-body"><strong>Home</strong><p>Visão geral do dia — tarefas, água, peso, refeição atual, suplementos e hábitos.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">2</div><div className="ajuda-body"><strong>Treino</strong><p>Exercícios com timer, descanso cronometrado, stats de kcal/volume/tempo e histórico completo.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">3</div><div className="ajuda-body"><strong>Rotina</strong><p>Gere blocos de dias com tarefas por período (Acordar, Manhã, Tarde, Noite). Enter cria a próxima tarefa. ⧉ clona o dia.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">4</div><div className="ajuda-body"><strong>Mais</strong><p>Acessa Água, Peso, Dieta, Suplementos, Macros, Passos e Stats pelo menu 🗃️.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">5</div><div className="ajuda-body"><strong>Home personalizável</strong><p>Toque em "✏️ Personalizar" na home para reordenar os cards arrastando ou ocultar seções que não usa. A ordem é salva automaticamente.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Hábitos personalizados</strong><p>Na aba Hábitos (menu 🗃️) role até o final e toque em "+ Adicionar hábito" para criar hábitos com emoji e nome personalizados.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Hábitos personalizados</strong><p>Na seção Hábitos do dia (Home), role até o final e toque em "+ Adicionar hábito". Você pode criar hábitos com emoji e nome personalizados além dos 6 padrões.</p></div></div>

              <div id="ajuda-cortisol" className="ajuda-group-title">🧠 Cortisol — o hormônio do estresse</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>O que é o cortisol?</strong><p>Hormônio produzido em resposta ao estresse. Cronicamente elevado causa retenção de líquido (até 2kg a mais na balança), dificulta queima de gordura, prejudica o sono e reduz testosterona.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Como reduzir?</strong><p>Dormir 7–8h, treinos moderados (máx. 1h/sessão), alimentação equilibrada, hidratação adequada e gerenciar estresse emocional.</p></div></div>

              <div id="ajuda-sono" className="ajuda-group-title">😴 Sono — por que 7 a 8 horas importam</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>O que acontece dormindo?</strong><p>O GH (hormônio do crescimento) é liberado durante o sono — responsável pela recuperação muscular e queima de gordura. Menos de 6h aumenta cortisol, grelina (fome) e reduz leptina (saciedade).</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Dica prática</strong><p>Acorde sempre no mesmo horário, mesmo no fim de semana. Evite telas 30 minutos antes de dormir.</p></div></div>

              <div id="ajuda-musculacao" className="ajuda-group-title">🏋️ Musculação — benefícios além da estética</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Metabolismo acelerado</strong><p>Cada kg de músculo queima 13–20 kcal por dia em repouso. Quanto mais massa muscular, mais calorias você gasta sem fazer nada.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Saúde mental e hormonal</strong><p>Treino de força aumenta testosterona, serotonina e dopamina. 3–4x por semana já gera benefício comprovado.</p></div></div>

              <div id="ajuda-hidratacao" className="ajuda-group-title">💧 Hidratação</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>35ml vs 50ml por kg</strong><p>35ml/kg é o mínimo para sedentários. Se você treina, use 50ml/kg. Desidratação de 2% já reduz performance em até 20%.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Água e cortisol</strong><p>Cortisol elevado causa retenção hídrica. Beber mais água paradoxalmente ajuda a reduzir essa retenção. Comece o dia com 500ml em jejum.</p></div></div>

              <div id="ajuda-dieta" className="ajuda-group-title">🥗 Dieta e Macros</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Deficit calórico</strong><p>1kg de gordura = ~7.700 kcal. Deficit de 500–800 kcal/dia = 0,5–0,8kg/semana. Acima de 1.000 kcal de deficit queima músculo e derruba o metabolismo.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Saldo calórico</strong><p>Na aba Macros você vê o saldo do dia: meta base + kcal do treino + kcal dos passos - kcal ingeridas. Verde = deficit (emagrecendo). Vermelho = superavit (ganhando peso).</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Sugestão de dieta automática</strong><p>Na aba Dieta toque em "✨ Sugestão de dieta automática", escolha seu objetivo (emagrecer, manter, ganhar massa) e renda financeira (baixa, média, alta). O app gera um plano alimentar completo que você pode editar depois.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Alimentos personalizados</strong><p>Não achou seu alimento no banco TACO? Na aba Macros role até "Alimentos Personalizados" e cadastre com nome, kcal, proteína, carboidrato e gordura por 100g.</p></div></div>

              <div id="ajuda-peso" className="ajuda-group-title">⚖️ Pesagem diária — como interpretar</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Por que pesar todo dia?</strong><p>O peso oscila 1–3kg por resíduo gástrico, hidratação e sódio. Essas variações não são gordura — são fluidos.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>A média de 7 dias é o que importa</strong><p>Se a média da semana 2 for menor que a da semana 1, você emagreceu. Um único dia nunca conta a história real.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Como se pesar corretamente</strong><p>Sempre em jejum logo após acordar, após urinar, sem roupa ou com roupa leve sempre igual. Mesmo horário todo dia.</p></div></div>
              <div id="ajuda-passos" className="ajuda-group-title">👟 Passos diários</div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Como registrar seus passos</strong><p>Usa relógio ou celular que conta passos? Ao final do dia vá na aba Passos (menu 🗃️) e registre quantos passos você deu. Com o tempo você terá um histórico real da sua atividade diária.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Por que 10.000 passos?</strong><p>A OMS recomenda 10.000 passos por dia para adultos saudáveis — equivale a aproximadamente 8km e 400 kcal. Mas qualquer aumento já traz benefícios: quem sai de 3.000 para 7.000 já reduz risco cardiovascular significativamente.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Passos e emagrecimento</strong><p>Cada 1.000 passos queima aproximadamente 40 kcal. 10.000 passos diários = ~400 kcal extras por dia.</p></div></div>
              <div id="ajuda-smartpocket" className="ajuda-group-title">💰 SmartPocket</div>
              <div className="ajuda-item"><div className="ajuda-num">1</div><div className="ajuda-body"><strong>O que é?</strong><p>O SmartPocket é seu controle financeiro pessoal integrado ao DayForge. Registre gastos, cartão, investimentos e entradas por mês.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">2</div><div className="ajuda-body"><strong>Gastos</strong><p>Registre suas contas fixas e variáveis do mês com descrição, valor e data de pagamento.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">3</div><div className="ajuda-body"><strong>Cartão de Crédito</strong><p>Lance suas compras no crédito separadamente para ter controle do quanto gastou no cartão.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">4</div><div className="ajuda-body"><strong>Investimentos</strong><p>Registre seus aportes em Caixinha/CDB, Bolsa de Valores ou Reserva de Emergência.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">5</div><div className="ajuda-body"><strong>Entradas</strong><p>Registre tudo que entrou no mês — salário, freelas, vendas, etc.</p></div></div>
              <div className="ajuda-item"><div className="ajuda-num">💡</div><div className="ajuda-body"><strong>Resumo</strong><p>Na aba Resumo você vê o balanço do mês — entradas menos gastos, cartão e investimentos. Verde = positivo, vermelho = negativo.</p></div></div>
            </div>
          )}
        </div>
                  )}
                </div>
              )
        }

        export default Treino