import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Habitos from './Habitos'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarTempo(segundos) {
  const s = Number(segundos || 0)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}min`
  return `${m}min`
}

function diasDesdeData(dataStr) {
  if (!dataStr) return null
  const diff = Date.now() - new Date(dataStr).getTime()
  return Math.floor(diff / 86400000)
}

export default function Home({ user, onIniciarTreino, treinando, treinoAtivo, divisao }) {
  const [perfil, setPerfil] = useState(null)
  const [historico, setHistorico] = useState([])
  const [streak, setStreak] = useState(0)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const [{ data: p }, { data: h }] = await Promise.all([
        supabase.from('perfil').select('*').eq('user_id', user.id).single(),
        supabase.from('treinos_finalizados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      if (p) setPerfil(p)
      if (h) {
        setHistorico(h)
        setStreak(calcularStreak(h))
      }
      setCarregando(false)
    }
    carregar()
  }, [user.id])

  function calcularStreak(hist) {
    if (!hist || hist.length === 0) return 0
    let streak = 0
    let diaAtual = new Date()
    diaAtual.setHours(0, 0, 0, 0)
    const diasTreino = new Set(hist.map(t => new Date(t.created_at).toLocaleDateString('pt-BR')))
    for (let i = 0; i < 60; i++) {
      const key = new Date(diaAtual.getTime() - i * 86400000).toLocaleDateString('pt-BR')
      if (diasTreino.has(key)) streak++
      else if (i > 0) break
    }
    return streak
  }

  const ultimoTreino = historico[0] || null
  const diasDescanso = ultimoTreino ? diasDesdeData(ultimoTreino.created_at) : null

  const volumeSemana = historico
    .filter(t => diasDesdeData(t.created_at) <= 7)
    .reduce((sum, t) => sum + (t.volume_total || 0), 0)

  const treinos7dias = historico.filter(t => diasDesdeData(t.created_at) <= 7).length

  const proximoTreino = () => {
    if (!divisao) return '—'
    if (!ultimoTreino) return divisao[0]
    const letras = divisao.split('')
    const idx = letras.indexOf(ultimoTreino.treino)
    return letras[(idx + 1) % letras.length] || letras[0]
  }

  const score = Math.min(100, Math.round(
    (treinos7dias / Math.max(divisao?.length || 3, 1)) * 60 +
    (diasDescanso !== null && diasDescanso <= 2 ? 40 : diasDescanso <= 4 ? 20 : 0)
  ))

  const scoreLabel = score >= 80 ? 'Excelente semana!' : score >= 50 ? 'No caminho certo' : score >= 20 ? 'Pode melhorar' : 'Bora treinar!'

  const nome = perfil?.nome ? perfil.nome.split(' ')[0] : user.email.split('@')[0]

  if (carregando) {
    return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 60 }}>Carregando...</div>
  }

  return (
    <div className="home-section">

      {/* Header */}
      <div className="home-header">
        <div>
          <h2 className="home-greeting">{getGreeting()}, {nome}!</h2>
          <p className="home-date">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="home-streak">🔥 {streak} dia{streak > 1 ? 's' : ''}</div>
        )}
      </div>

      {/* Score card */}
      <div className="home-score-card">
        <div className="home-score-left">
          <div className="home-score-label">SCORE DA SEMANA</div>
          <div className="home-score-num">{score}</div>
          <div className="home-score-sub">{scoreLabel}</div>
        </div>
        <div className="home-score-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff08" strokeWidth="5"/>
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={score >= 75 ? '#10b981' : score >= 40 ? '#fbbf24' : '#6366f1'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 163.4} 163.4`}
              transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dasharray .5s' }}
            />
          </svg>
          <span className="home-score-pct">{score}%</span>
        </div>
      </div>

      {/* 3 pilares */}
      <div className="home-pilares">
        <div
          className={`home-pilar ${treinando ? 'active' : ''}`}
          onClick={onIniciarTreino}
          style={{ cursor: 'pointer' }}
        >
          <div className="home-pilar-icon">🏋️</div>
          <div className="home-pilar-label">Treino</div>
          <div className="home-pilar-val">
            {treinando ? <span style={{ color: '#10b981' }}>Em andamento</span>
              : ultimoTreino ? `${treinos7dias}x na semana`
              : 'Nenhum ainda'}
          </div>
          <div className="home-pilar-bar">
            <div className="home-pilar-bar-fill" style={{
              width: `${Math.min(100, (treinos7dias / Math.max(divisao?.length || 3, 1)) * 100)}%`,
              background: '#6366f1'
            }}/>
          </div>
        </div>

        <div className="home-pilar">
          <div className="home-pilar-icon">📦</div>
          <div className="home-pilar-label">Volume</div>
          <div className="home-pilar-val">
            {volumeSemana > 0 ? `${(volumeSemana / 1000).toFixed(1)}t` : '—'}
          </div>
          <div className="home-pilar-bar">
            <div className="home-pilar-bar-fill" style={{
              width: `${Math.min(100, volumeSemana / 500)}%`,
              background: '#f97316'
            }}/>
          </div>
        </div>

        <div className="home-pilar">
          <div className="home-pilar-icon">😴</div>
          <div className="home-pilar-label">Descanso</div>
          <div className="home-pilar-val">
            {diasDescanso === null ? '—'
              : diasDescanso === 0 ? 'Hoje'
              : diasDescanso === 1 ? 'Ontem'
              : `${diasDescanso}d atrás`}
          </div>
          <div className="home-pilar-bar">
            <div className="home-pilar-bar-fill" style={{
              width: diasDescanso !== null ? `${Math.max(0, 100 - diasDescanso * 20)}%` : '0%',
              background: '#10b981'
            }}/>
          </div>
        </div>
      </div>

      {/* Próximo treino + botão */}
      <div className="home-proximo">
        <div className="home-proximo-info">
          <div className="home-proximo-label">PRÓXIMO TREINO</div>
          <div className="home-proximo-letra">{proximoTreino()}</div>
        </div>
        <button
          className={`home-btn-treino ${treinando ? 'em-andamento' : ''}`}
          onClick={onIniciarTreino}
        >
          {treinando ? `⏱ Treino ${treinoAtivo} ativo` : `▶ Iniciar Treino ${proximoTreino()}`}
        </button>
      </div>

      {/* Último treino */}
      {ultimoTreino && (
        <div className="home-ultimo">
          <div className="home-ultimo-header">
            <span className="home-ultimo-title">ÚLTIMO TREINO</span>
            <span className="home-ultimo-badge">
              {diasDescanso === 0 ? 'Hoje' : diasDescanso === 1 ? 'Ontem' : `${diasDescanso}d atrás`}
            </span>
          </div>
          <div className="home-ultimo-stats">
            <div className="home-ultimo-stat">
              <span>TREINO</span>
              <strong>{ultimoTreino.treino}</strong>
            </div>
            <div className="home-ultimo-stat">
              <span>TEMPO</span>
              <strong>{formatarTempo(ultimoTreino.tempo_segundos)}</strong>
            </div>
            <div className="home-ultimo-stat">
              <span>VOLUME</span>
              <strong>{ultimoTreino.volume_total ? `${(ultimoTreino.volume_total / 1000).toFixed(1)}t` : '—'}</strong>
            </div>
            {ultimoTreino.kcal > 0 && (
              <div className="home-ultimo-stat">
                <span>KCAL</span>
                <strong>{ultimoTreino.kcal}</strong>
              </div>
            )}
          </div>
        </div>
      )}
        {/* Hábitos do dia */}
        <div className="home-habitos">
          <div className="home-section-title">HÁBITOS DO DIA</div>
          <Habitos user={user} compact={true} />
        </div>

      {/* Histórico rápido da semana */}
      {historico.filter(t => diasDesdeData(t.created_at) <= 6).length > 0 && (
        <div className="home-semana">
          <div className="home-semana-title">SEMANA</div>
          <div className="home-semana-dias">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - (6 - i))
              const key = d.toLocaleDateString('pt-BR')
              const treino = historico.find(t => new Date(t.created_at).toLocaleDateString('pt-BR') === key)
              return (
                <div key={i} className={`home-semana-dia ${treino ? 'feito' : ''}`} title={key}>
                  <div className="home-semana-dia-letter">
                    {d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                  </div>
                  <div className={`home-semana-dia-dot ${treino ? 'feito' : ''}`}>
                    {treino ? treino.treino : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}