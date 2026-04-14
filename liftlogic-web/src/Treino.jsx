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
const [abaPrincipal, setAbaPrincipal] = useState('treino')
  const [historico, setHistorico] = useState([])
  const [modalResumo, setModalResumo] = useState(null)


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
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [perfilMsg, setPerfilMsg] = useState('')
  const [dashData, setDashData] = useState({ historico: [], exercicioSelecionado: null, evolucao: [] })

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
    if (data) setPerfil({ nome: data.nome || '', peso: data.peso || '', altura: data.altura || '', idade: data.idade || '', sexo: data.sexo || 'M' })
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
    else setPerfilMsg('Perfil salvo com sucesso! ✅')
    setSalvandoPerfil(false)
    setTimeout(() => setPerfilMsg(''), 3000)
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
    const filtrados = exercicios.filter(ex => ex.treino === treinoAtivo)
    const volumeTotal = filtrados.reduce((acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0)
    const concluídosCount = Object.values(concluidos).filter(Boolean).length
    const kcal = perfil.peso ? Math.round(5.0 * Number(perfil.peso) * (tempoTotal / 3600)) : null
    const maisHeavy = filtrados.reduce((max, ex) => Number(ex.carga) > Number(max?.carga || 0) ? ex : max, null)
    setModalResumo({ volumeTotal, concluídosCount, total: filtrados.length, kcal, maisHeavy })
  }

    const confirmarFinalizarTreino = async () => {
    localStorage.removeItem(TREINO_START_KEY)
    localStorage.removeItem(TREINO_ATIVO_KEY)
    const filtrados = exercicios.filter(ex => ex.treino === treinoAtivo)
    const volumeTotal = filtrados.reduce((acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0)
    const { data, error } = await supabase.from('treinos_finalizados').insert([{
      treino: treinoAtivo, tempo_segundos: tempoTotal, volume_total: volumeTotal, kcal: modalResumo.kcal || 0, user_id: user.id
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

  const formatarTempo = segundos => {
    const s = Number(segundos || 0)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  if (!divisao) {
    return (
      <div className="container selection-screen">
        <h1>🏋️‍♂️ LiftLogic</h1>
        <p className="subtitle">Olá, {user.email.split('@')[0]}! Escolha sua divisão:</p>
        <div className="selection-grid">
          {['AB', 'ABC', 'ABCD', 'ABCDE'].map(op => (
            <button key={op} onClick={() => { setDivisao(op); setTreinoAtivo('A') }} className="select-btn">{op}</button>
          ))}
        </div>
      </div>
    )
  }

  const abasDisponiveis = divisao.split('')
  const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)
  const imc = calcularIMC()
  const tmb = calcularTMB()

  return (
    <div className="container">
      {modalResumo && (
        <div className="modal-overlay">
          <div className="modal-resumo">
            <h2>🏁 Resumo do Treino {treinoAtivo}</h2>
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

      <nav className="main-nav">
        <button className={abaPrincipal === 'home' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('home')}>🏠</button>
        <button className={abaPrincipal === 'treino' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('treino')}>🏋️‍♂️</button>
        <button className={abaPrincipal === 'rotina' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('rotina')}>📋</button>
        <button className={abaPrincipal === 'agua' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('agua')}>💧</button>
         <button className={abaPrincipal === 'historico' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('historico')}>📜</button>
        <button className={abaPrincipal === 'perfil' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('perfil')}>👤</button>
        <button className={abaPrincipal === 'dashboard' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('dashboard')}>📊</button>
        <button className="nav-btn nav-btn-logout" onClick={logout}>Sair</button>
      </nav>

      {abaPrincipal === 'home' && (
        <Home
          user={user}
          onIniciarTreino={() => setAbaPrincipal('treino')}
          treinando={treinando}
          treinoAtivo={treinoAtivo}
          divisao={divisao}
        />
      )}

      {abaPrincipal === 'rotina' && (
            <Rotina user={user} />
      )}

      {abaPrincipal === 'agua' && (
        <Agua user={user} />
      )}

      {abaPrincipal === 'treino' && (
        <>
          <header className="header-app">
            <button className="back-btn" onClick={() => { localStorage.removeItem('divisao'); setDivisao(null) }}>← Trocar Divisão</button>
          </header>

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
            {carregando && <p className="empty-msg">Carregando...</p>}
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
        </>
      )}

      {abaPrincipal === 'dashboard' && (
        <div className="dashboard-section">
          <h1 className="title-divisao">Dashboard 📊</h1>
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

      {abaPrincipal === 'historico' && (
        <div className="historico-section">
          <h1 className="title-divisao">Meu Histórico 📜</h1>
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

      {abaPrincipal === 'perfil' && (
        <div className="perfil-section">
          <h1 className="title-divisao">Meu Perfil 👤</h1>
          <form className="form-cadastro" onSubmit={salvarPerfil}>
            <input type="text" placeholder="Seu nome" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} />
            <div className="row">
              <input type="number" placeholder="Peso (kg)" value={perfil.peso} onChange={e => setPerfil({ ...perfil, peso: e.target.value })} />
              <input type="number" placeholder="Altura (cm)" value={perfil.altura} onChange={e => setPerfil({ ...perfil, altura: e.target.value })} />
              <input type="number" placeholder="Idade" value={perfil.idade} onChange={e => setPerfil({ ...perfil, idade: e.target.value })} />
            </div>
            <div className="sexo-selector">
              <button type="button" className={perfil.sexo === 'M' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setPerfil({ ...perfil, sexo: 'M' })}>♂ Masculino</button>
              <button type="button" className={perfil.sexo === 'F' ? 'sexo-btn active' : 'sexo-btn'} onClick={() => setPerfil({ ...perfil, sexo: 'F' })}>♀ Feminino</button>
            </div>
            <button type="submit" disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando...' : 'Salvar Perfil'}</button>
            {perfilMsg && <p className={perfilMsg.includes('Erro') ? 'auth-erro' : 'auth-sucesso'}>{perfilMsg}</p>}
          </form>
          {(imc || tmb) && (
            <div className="stats-grid">
              {imc && (
                <div className="stat-card">
                  <span>IMC</span>
                  <strong style={{ color: classificarIMC(imc).color }}>{imc}</strong>
                  <small>{classificarIMC(imc).label}</small>
                </div>
              )}
              {tmb && (
                <div className="stat-card">
                  <span>TMB</span>
                  <strong>{tmb}</strong>
                  <small>kcal/dia em repouso</small>
                </div>
              )}
              {perfil.peso && perfil.altura && (
                <div className="stat-card">
                  <span>PESO</span>
                  <strong>{perfil.peso} kg</strong>
                  <small>{perfil.altura} cm</small>
                </div>
              )}
              {perfil.idade && (
                <div className="stat-card">
                  <span>IDADE</span>
                  <strong>{perfil.idade}</strong>
                  <small>anos</small>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Treino