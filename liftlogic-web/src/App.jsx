import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [exercicios, setExercicios] = useState([])
  const [divisao, setDivisao] = useState(localStorage.getItem('divisao') || null)
  const [treinoAtivo, setTreinoAtivo] = useState('A')
  const [concluidos, setConcluidos] = useState({})
  const [carregando, setCarregando] = useState(false)

  // TIMER
  const [treinando, setTreinando] = useState(false)
  const [tempoTotal, setTempoTotal] = useState(0)
  const [descanso, setDescanso] = useState(0)
  const [inputDescanso, setInputDescanso] = useState('')

  const timerRef = useRef(null)
  const descansoRef = useRef(null)

  const [novoExercicio, setNovoExercicio] = useState({
    nome: '',
    series: '',
    repeticoes: '',
    carga: '',
    grupoMuscular: '',
    treino: 'A'
  })

  // ===== Cronômetro total (sobe 1s) =====
  useEffect(() => {
    if (treinando) {
      timerRef.current = setInterval(() => {
        setTempoTotal(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [treinando])

  // ===== Descanso (contagem regressiva) =====
  useEffect(() => {
    if (descanso > 0) {
      descansoRef.current = setInterval(() => {
        setDescanso(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    } else {
      clearInterval(descansoRef.current)
    }
    return () => clearInterval(descansoRef.current)
  }, [descanso])

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  const iniciarTreino = () => {
    setTreinando(true)
    setTempoTotal(0)
    setDescanso(0)
    setInputDescanso('')
  }

  const finalizarTreino = () => {
    setTreinando(false)
    setTempoTotal(0)
    setDescanso(0)
    setInputDescanso('')
  }

  const iniciarDescansoManual = () => {
    const segundos = parseInt(inputDescanso, 10)
    if (!Number.isFinite(segundos) || segundos <= 0) return
    setDescanso(segundos)
    setInputDescanso('')
  }

  const cancelarDescanso = () => {
    setDescanso(0)
  }

  // ===== API =====
  const buscarExercicios = () => {
    axios.get('http://localhost:8080/api/exercicios')
      .then(res => setExercicios(res.data))
      .catch(err => console.error('Erro ao buscar:', err))
  }

  useEffect(() => {
    buscarExercicios()
  }, [])

  useEffect(() => {
    if (divisao) localStorage.setItem('divisao', divisao)
  }, [divisao])

  const salvarExercicio = (e) => {
    e.preventDefault()
    setCarregando(true)

    const exercicioParaSalvar = { ...novoExercicio, treino: treinoAtivo }

    axios.post('http://localhost:8080/api/exercicios', exercicioParaSalvar)
      .then(() => {
        buscarExercicios()
        setNovoExercicio({
          nome: '',
          series: '',
          repeticoes: '',
          carga: '',
          grupoMuscular: '',
          treino: treinoAtivo
        })
      })
      .catch(err => console.error('Erro ao salvar:', err))
      .finally(() => setCarregando(false))
  }

  const deletarExercicio = (id) => {
    axios.delete(`http://localhost:8080/api/exercicios/${id}`)
      .then(() => buscarExercicios())
      .catch(err => console.error('Erro ao deletar:', err))
  }

  const toggleConcluido = (id) => {
    setConcluidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ===== Tela inicial (seleção de divisão) =====
  if (!divisao) {
    return (
      <div className="container selection-screen">
        <h1>🏋️‍♂️ LiftLogic</h1>
        <p className="subtitle">Escolha sua estratégia de treino:</p>

        <div className="selection-grid">
          {['AB', 'ABC', 'ABCD', 'ABCDE'].map(op => (
            <button
              key={op}
              onClick={() => { setDivisao(op); setTreinoAtivo('A') }}
              className="select-btn"
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const abasDisponiveis = divisao.split('')
  const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)
  const volumeTotal = exerciciosFiltrados.reduce(
    (acc, ex) => acc + (Number(ex.series) * Number(ex.repeticoes) * Number(ex.carga)),
    0
  )

  return (
    <div className="container">
      <header className="header-app">
        <button
          className="back-btn"
          onClick={() => { localStorage.removeItem('divisao'); setDivisao(null) }}
        >
          ← Trocar Divisão
        </button>

        <div className="volume-badge">
          <span>VOLUME TOTAL</span>
          <strong>{volumeTotal.toLocaleString()} kg</strong>
        </div>
      </header>

      {/* TIMER */}
      <div className="timer-section">
        {!treinando ? (
          <button className="btn-start-workout" onClick={iniciarTreino}>
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

              <div className="custom-rest-input">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Quanto tempo quer descansar? (seg)"
                  value={inputDescanso}
                  onChange={(e) => setInputDescanso(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') iniciarDescansoManual()
                  }}
                />

                <div className="rest-actions">
                  <button
                    type="button"
                    className="btn-play-rest"
                    onClick={iniciarDescansoManual}
                    title="Iniciar descanso"
                    aria-label="Iniciar descanso"
                  >
                    ▶
                  </button>

                  <button
                    type="button"
                    className="btn-cancel-rest"
                    onClick={cancelarDescanso}
                    title="Cancelar descanso"
                    aria-label="Cancelar descanso"
                    disabled={descanso === 0}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <button className="btn-stop-workout" onClick={finalizarTreino}>
              Finalizar Treino
            </button>
          </div>
        )}
      </div>

      <h1 className="title-divisao">Treino {divisao}</h1>

      <div className="tabs">
        {abasDisponiveis.map(letra => (
          <button
            key={letra}
            className={treinoAtivo === letra ? 'tab-button active' : 'tab-button'}
            onClick={() => setTreinoAtivo(letra)}
          >
            {letra}
          </button>
        ))}
      </div>

      {/* FORM (some quando está treinando) */}
      {!treinando && (
        <form className="form-cadastro" onSubmit={salvarExercicio}>
          <input
            type="text"
            placeholder="Nome do Exercício (ex: Supino Reto)"
            value={novoExercicio.nome}
            onChange={e => setNovoExercicio({ ...novoExercicio, nome: e.target.value })}
            required
          />

          <input
            type="text"
            placeholder="Grupo Muscular (ex: Peitoral)"
            value={novoExercicio.grupoMuscular}
            onChange={e => setNovoExercicio({ ...novoExercicio, grupoMuscular: e.target.value })}
            required
          />

          <div className="row">
            <input
              type="number"
              placeholder="Séries"
              value={novoExercicio.series}
              onChange={e => setNovoExercicio({ ...novoExercicio, series: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Reps"
              value={novoExercicio.repeticoes}
              onChange={e => setNovoExercicio({ ...novoExercicio, repeticoes: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Kg"
              value={novoExercicio.carga}
              onChange={e => setNovoExercicio({ ...novoExercicio, carga: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={carregando}>
            {carregando ? '...' : `Adicionar ao Treino ${treinoAtivo}`}
          </button>
        </form>
      )}

      {/* LISTA */}
      <div className="lista-exercicios">
        {exerciciosFiltrados.map(ex => (
          <div key={ex.id} className={`card ${concluidos[ex.id] ? 'concluido' : ''}`}>
            <div className="card-header">
              <span className="tag">{ex.grupoMuscular}</span>
              <button className="btn-delete-mini" onClick={() => deletarExercicio(ex.id)}>×</button>
            </div>

            <div className="card-main-row">
              <button className="btn-check" onClick={() => toggleConcluido(ex.id)}>
                {concluidos[ex.id] ? '✅' : '⭕'}
              </button>

              <div className="exercise-details">
                <h3>{ex.nome}</h3>
                <p className="exercise-stats">{ex.series} séries x {ex.repeticoes} reps</p>
              </div>
            </div>

            <div className="info">
              <p>Carga: <strong>{ex.carga}kg</strong></p>
              <p className="volume-item">{Number(ex.series) * Number(ex.repeticoes) * Number(ex.carga)}kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App