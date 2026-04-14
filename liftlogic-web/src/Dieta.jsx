import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

const REFEICOES = [
  { id: 'cafe',      label: '☀️ Café da manhã',  horaDe: 5,  horeAte: 9,  placeholder: 'Ex: 3 ovos mexidos\n1 banana\ncafé preto' },
  { id: 'lanche1',   label: '🍎 Lanche da manhã', horaDe: 10, horeAte: 11, placeholder: 'Ex: 50g de aveia\n30g de leite em pó' },
  { id: 'almoco',    label: '🍽️ Almoço',          horaDe: 12, horeAte: 13, placeholder: 'Ex: 120g de arroz\n200g de frango grelhado\nsalada à vontade' },
  { id: 'cafetarde', label: '☕ Café da tarde',   horaDe: 14, horeAte: 17, placeholder: 'Ex: 1 ovo cozido\ncafé preto' },
  { id: 'janta',     label: '🌙 Janta',           horaDe: 18, horeAte: 22, placeholder: 'Ex: 120g de frango desfiado\n120g de arroz\nfeijão' },
]

export default function Dieta({ user, compact = false }) {
  const [plano, setPlano]           = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando]     = useState(false)

  const buscarDieta = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.from('dieta_plano').select('*').eq('user_id', user.id)
    const mapa = {}
    ;(data || []).forEach(r => { mapa[r.refeicao] = r.conteudo })
    setPlano(mapa)
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarDieta() }, [buscarDieta])

  const salvarRefeicao = async (refeicaoId, conteudo) => {
    setSalvando(true)
    await supabase.from('dieta_plano').upsert({
      user_id: user.id, refeicao: refeicaoId, conteudo, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,refeicao' })
    setPlano(prev => ({ ...prev, [refeicaoId]: conteudo }))
    setSalvando(false)
  }

  const refeicaoAtual = () => {
    const hora = new Date().getHours()
    return REFEICOES.find(r => hora >= r.horaDe && hora <= r.horeAte) || null
  }

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 20 }}>Carregando...</div>

  // MODO COMPACTO — home mostra só refeição atual
  if (compact) {
    const atual = refeicaoAtual()
    if (!atual) return null
    const conteudo = plano[atual.id]?.trim()
    if (!conteudo) return null
    const linhas = conteudo.split('\n').filter(l => l.trim())
    return (
      <div className="dieta-compact">
        <div className="dieta-compact-label">{atual.label}</div>
        {linhas.map((l, i) => (
          <div key={i} className="dieta-compact-item">· {l.trim()}</div>
        ))}
      </div>
    )
  }

  // MODO COMPLETO
  return (
    <div className="dieta-section">
      <div className="dieta-header">
        <h2 className="title-divisao" style={{ margin: 0 }}>🥗 Minha Dieta</h2>
        {salvando && <span style={{ fontSize: 12, color: '#64748b' }}>Salvando...</span>}
      </div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
        Monte seu plano alimentar. A refeição do horário atual aparece na Home.
      </p>

      {REFEICOES.map(r => {
        const hora = new Date().getHours()
        const isAtual = hora >= r.horaDe && hora <= r.horeAte
        return (
          <div key={r.id} className={`dieta-card ${isAtual ? 'atual' : ''}`}>
            <div className="dieta-card-header">
              <div className="dieta-card-label">{r.label}</div>
              {isAtual && <span className="dieta-card-badge">Agora</span>}
              <div className="dieta-card-horario">{r.horaDe}h – {r.horeAte}h</div>
            </div>
            <textarea
              className="dieta-textarea"
              placeholder={r.placeholder}
              value={plano[r.id] || ''}
              rows={4}
              onChange={e => setPlano(prev => ({ ...prev, [r.id]: e.target.value }))}
              onBlur={e => salvarRefeicao(r.id, e.target.value)}
            />
          </div>
        )
      })}
    </div>
  )
}