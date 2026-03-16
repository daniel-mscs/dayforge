import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [exercicios, setExercicios] = useState([])
  const [treinoAtivo, setTreinoAtivo] = useState('A')
  const [carregando, setCarregando] = useState(false)

  const [novoExercicio, setNovoExercicio] = useState({
    nome: '',
    series: '',
    repeticoes: '',
    carga: '',
    grupoMuscular: '',
    treino: 'A'
  })

  const buscarExercicios = () => {
    axios.get('http://localhost:8080/api/exercicios')
      .then(res => setExercicios(res.data))
      .catch(err => console.error("Erro ao buscar:", err))
  }

  useEffect(() => {
    buscarExercicios()
  }, [])

  const salvarExercicio = (e) => {
    e.preventDefault()
    setCarregando(true)
    const exercicioParaSalvar = { ...novoExercicio, treino: treinoAtivo }
    axios.post('http://localhost:8080/api/exercicios', exercicioParaSalvar)
      .then(() => {
        buscarExercicios()
        setNovoExercicio({ nome: '', series: '', repeticoes: '', carga: '', grupoMuscular: '', treino: treinoAtivo })
      })
      .catch(err => console.error("Erro ao salvar:", err))
      .finally(() => setCarregando(false))
  }

  const deletarExercicio = (id) => {
    axios.delete(`http://localhost:8080/api/exercicios/${id}`)
      .then(() => buscarExercicios())
      .catch(err => console.error("Erro ao deletar:", err))
  }

  const exerciciosFiltrados = exercicios.filter(ex => ex.treino === treinoAtivo)

  return (
    <div className="container">
      <h1>
        <span>🏋️‍♂️</span> LiftLogic
      </h1>

      <div className="tabs">
        {['A', 'B', 'C', 'D', 'E'].map(letra => (
          <button
            key={letra}
            className={treinoAtivo === letra ? 'tab-button active' : 'tab-button'}
            onClick={() => setTreinoAtivo(letra)}
          >
            Treino {letra}
          </button>
        ))}
      </div>

      <form className="form-cadastro" onSubmit={salvarExercicio}>
        <input
          type="text"
          placeholder="Nome do Exercício (ex: Supino)"
          value={novoExercicio.nome}
          onChange={e => setNovoExercicio({...novoExercicio, nome: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Grupo Muscular (ex: Peito)"
          value={novoExercicio.grupoMuscular}
          onChange={e => setNovoExercicio({...novoExercicio, grupoMuscular: e.target.value})}
          required
        />
        <div className="row">
          <input type="number" placeholder="Séries" value={novoExercicio.series} onChange={e => setNovoExercicio({...novoExercicio, series: e.target.value})} required />
          <input type="number" placeholder="Reps" value={novoExercicio.repeticoes} onChange={e => setNovoExercicio({...novoExercicio, repeticoes: e.target.value})} required />
          <input type="number" placeholder="Kg" value={novoExercicio.carga} onChange={e => setNovoExercicio({...novoExercicio, carga: e.target.value})} required />
        </div>
        <button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : `Adicionar ao Treino ${treinoAtivo}`}
        </button>
      </form>

      <div className="lista-exercicios">
        <h2 className="titulo-sessao">Exercícios — Treino {treinoAtivo}</h2>
        {exerciciosFiltrados.length === 0 ? (
          <p className="empty-msg">Nenhum exercício no Treino {treinoAtivo} ainda.</p>
        ) : (
          exerciciosFiltrados.map(ex => (
            <div key={ex.id} className="card">
              <button className="btn-delete" onClick={() => deletarExercicio(ex.id)}>×</button>
              <span className="tag">{ex.grupoMuscular}</span>
              <h3>{ex.nome}</h3>
              <div className="info">
                <div>
                  <p>{ex.series} séries x {ex.repeticoes} reps</p>
                  <p>Carga: <strong>{ex.carga} kg</strong></p>
                </div>
                <p className="volume">Vol: {ex.series * ex.repeticoes * ex.carga} kg</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App