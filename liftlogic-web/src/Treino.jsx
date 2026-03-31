import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function Treino({ logout, user }) {
  const [exercicios, setExercicios] = useState([])
  const [divisao, setDivisao] = useState(localStorage.getItem('divisao') || null)
  const [treinoAtivo, setTreinoAtivo] = useState('A')
  const [concluidos, setConcluidos] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [abaPrincipal, setAbaPrincipal] = useState('treino')
  const [historico, setHistorico] = useState([])

  const [treinando, setTreinando] = useState(false)
  const [tempoTotal, setTempoTotal] = useState(0)
  const [descanso, setDescanso] = useState(0)
  const [inputDescanso, setInputDescanso] = useState('')

  const timerRef = useRef(null)
  const descansoRef = useRef(null)
  const alertaAtivoRef = useRef(false)
  const audioRef = useRef(new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.wav'))

  const [novoExercicio, setNovoExercicio] = useState({
    nome: '', series: '', repeticoes: '', carga: '', grupo_muscular: '', treino: 'A'
  })

  // --- SOM ---
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
        alertaAtivoRef.current = false
      }
    }, 600)
  }

  // --- DADOS ---
  const buscarExercicios = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('exercicio')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true })
    if (error) console.error('Erro:', error.message)
    else setExercicios(data || [])
    setCarregando(false)
  }

  const buscarHistorico = async () => {
    const { data, error } = await supabase
      .from('treinos_finalizados')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('Erro:', error.message)
    else setHistorico(data || [])
  }

  useEffect(() => { buscarExercicios() }, [])
  useEffect(() => {
    if (divisao) localStorage.setItem('divisao', divisao)
  }, [divisao])
  useEffect(() => {
    if (abaPrincipal === 'historico') buscarHistorico()
  }, [abaPrincipal])

  // --- CRONÔMETROS ---
  useEffect(() => {
    if (treinando) {
      timerRef.current = setInterval(() => setTempoTotal(p => p + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [treinando])

  useEffect(() => {
    clearInterval(descansoRef.current)
    if (descanso > 0) {
      descansoRef.current = setInterval(() => {
        setDescanso(prev => {
          if (prev <= 1) { tocarAlertaLongo(); return 0 }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(descansoRef.current)
  }, [descanso])

  const adicionarDescanso = (segundos) => setDescanso(prev => prev + segundos)

  const iniciarDescansoManual = () => {
    const segundos = parseInt(inputDescanso, 10)
    if (!Number.isFinite(segundos) || segundos <= 0) return
    setDescanso(segundos)
    setInputDescanso('')
  }

  // --- AÇÕES ---
  const finalizarTreino = async () => {
    const filtrados = exercicios.filter(ex => ex.treino === treinoAtivo)
    const volumeTotal = filtrados.reduce(
      (acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0
    )
    const { data, error } = await supabase
      .from('treinos_finalizados')
      .insert([{ treino: treinoAtivo, tempo_segundos: tempoTotal, volume_total: volumeTotal, user_id: user.id }])
      .select()
    if (error) { alert('Erro ao salvar: ' + error.message); return }
    alert(`Treino ${treinoAtivo} finalizado! 🔥\nTempo: ${formatarTempo(tempoTotal)}\nVolume: ${volumeTotal.toLocaleString()} kg`)
    setTreinando(false)
    setTempoTotal(0)
    setDescanso(0)
    setConcluidos({})
    if (data) setHistorico(prev => [data[0], ...prev])
  }

  const salvarExercicio = async (e) => {
    e.preventDefault()
    setCarregando(true)
    const { error } = await supabase.from('exercicio').insert([{
      nome: novoExercicio.nome,
      grupo_muscular: novoExercicio.grupo_muscular,
      series: Number(novoExercicio.series),
      repeticoes: Number(novoExercicio.repeticoes),
      carga: Number(novoExercicio.carga),
      treino: treinoAtivo,
      user_id: user.id
    }])
    if (error) alert(error.message)
    else {
      buscarExercicios()
      setNovoExercicio({ nome: '', series: '', repeticoes: '', carga: '', grupo_muscular: '', treino: treinoAtivo })
    }
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
  const volumeTotal = exerciciosFiltrados.reduce(
    (acc, ex) => acc + (Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)), 0
  )

  return (
    <div className="container">
      <nav className="main-nav">
        <button className={abaPrincipal === 'treino' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('treino')}>🏋️‍♂️ Treino</button>
        <button className={abaPrincipal === 'historico' ? 'nav-btn active' : 'nav-btn'} onClick={() => setAbaPrincipal('historico')}>📜 Histórico</button>
        <button className="nav-btn nav-btn-logout" onClick={logout}>Sair</button>
      </nav>

      {abaPrincipal === 'treino' && (
        <>
          <header className="header-app">
            <button className="back-btn" onClick={() => { localStorage.removeItem('divisao'); setDivisao(null) }}>← Trocar Divisão</button>
            <div className="volume-badge">
              <span>VOLUME TOTAL</span>
              <strong>{volumeTotal.toLocaleString()} kg</strong>
            </div>
          </header>

          <div className="timer-section">
            {!treinando ? (
              <button className="btn-start-workout" onClick={() => { setTreinando(true); setTempoTotal(0) }}>
                ▶ Iniciar Treino {treinoAtivo}
              </button>
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
                      <button type="button" className="btn-cancel-rest" onClick={() => setDescanso(0)} disabled={descanso === 0}>✕</button>
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
            {exerciciosFiltrados.map(ex => (
              <div key={ex.id} className={`card ${concluidos[ex.id] ? 'concluido' : ''}`}>
                <div className="card-header">
                  <span className="tag">{ex.grupo_muscular}</span>
                  <button className="btn-delete-mini" onClick={() => deletarExercicio(ex.id)}>×</button>
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
                    <span>Carga:</span>
                    <input type="number" className="inline-edit carga-input" defaultValue={ex.carga} onBlur={e => atualizarExercicio(ex.id, 'carga', e.target.value)} />
                    <strong>kg</strong>
                  </div>
                  <p>{Number(ex.series || 0) * Number(ex.repeticoes || 0) * Number(ex.carga || 0)} kg</p>
                </div>
              </div>
            ))}
          </div>
        </>
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
                  <div className="hist-stat-item"><span>VOLUME</span><strong>{Number(t.volume_total || 0).toLocaleString()} kg</strong></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Treino