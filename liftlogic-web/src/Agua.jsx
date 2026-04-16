import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

function formatarData(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return formatarData(d)
  })
}

export default function Agua({ user, onAjuda }) {
  const [registros, setRegistros]     = useState([])
  const [historico, setHistorico]     = useState({})
  const [meta, setMeta]               = useState(2500)
  const [metaInput, setMetaInput]     = useState('')
  const [customMl, setCustomMl]       = useState('')
  const [carregando, setCarregando]   = useState(true)
  const [perfil, setPerfil]           = useState(null)

  const hoje    = formatarData(new Date())
  const ultimos7 = getLast7Days()

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [{ data: regs }, { data: metaData }, { data: perfilData }] = await Promise.all([
      supabase.from('agua_registro').select('*').eq('user_id', user.id).gte('data', ultimos7[0]).order('data', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('agua_meta').select('*').eq('user_id', user.id).single(),
      supabase.from('perfil').select('peso').eq('user_id', user.id).single(),
    ])

    const hist = {}
    ultimos7.forEach(d => { hist[d] = [] })
    ;(regs || []).forEach(r => {
      if (!hist[r.data]) hist[r.data] = []
      hist[r.data].push(r)
    })

    setHistorico(hist)
    const registrosHoje = (regs || []).filter(r => r.data === hoje)
    setRegistros(registrosHoje)
    if (metaData) setMeta(metaData.meta_ml)
    if (perfilData) setPerfil(perfilData)
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  const totalHoje = registros.reduce((sum, r) => sum + r.ml, 0)
  const pct       = Math.min(100, Math.round((totalHoje / meta) * 100))

  const adicionarAgua = async (ml) => {
    if (!ml || ml <= 0) return
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const { data, error } = await supabase.from('agua_registro').insert([{
      user_id: user.id, data: hoje, ml: Number(ml), hora
    }]).select()
    if (error) { alert('Erro: ' + error.message); return }
    setRegistros(prev => [data[0], ...prev])
    setHistorico(prev => ({ ...prev, [hoje]: [data[0], ...(prev[hoje] || [])] }))
    setCustomMl('')
  }

  const deletarRegistro = async (id) => {
    await supabase.from('agua_registro').delete().eq('id', id)
    setRegistros(prev => prev.filter(r => r.id !== id))
    setHistorico(prev => ({ ...prev, [hoje]: (prev[hoje] || []).filter(r => r.id !== id) }))
  }

  const salvarMeta = async (novoMl) => {
    const val = Number(novoMl || metaInput)
    if (!val || val < 500) { alert('Meta inválida!'); return }
    await supabase.from('agua_meta').upsert({ user_id: user.id, meta_ml: val }, { onConflict: 'user_id' })
    setMeta(val)
    setMetaInput('')
  }

  const sugerirMeta = (tipo) => {
    if (!perfil?.peso) { alert('Cadastre seu peso no perfil primeiro!'); return }
    const ml = tipo === 'sedentario'
      ? Math.round(perfil.peso * 35)
      : Math.round(perfil.peso * 50)
    salvarMeta(ml)
  }

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando...</div>

  return (
    <div className="agua-section">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="title-divisao" style={{ margin: 0 }}>💧 Controle de Água</h2>
        <button className="ajuda-shortcut-btn" onClick={() => onAjuda('ajuda-hidratacao')}>?</button>
      </div>

      {/* Card principal */}
      <div className="agua-main-card">
        <div className="agua-main-top">
          <div>
            <div className="agua-main-label">CONSUMIDO HOJE</div>
            <div className="agua-main-val">{totalHoje.toLocaleString('pt-BR')} <span>ml</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="agua-main-label">META</div>
            <div className="agua-main-meta">{meta.toLocaleString('pt-BR')} ml</div>
          </div>
        </div>
        <div className="agua-bar-bg">
          <div className="agua-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#3b82f6' }} />
        </div>
        <div className="agua-bar-pct">{pct}% da meta {pct >= 100 ? '✅' : ''}</div>
      </div>

      {/* Meta */}
      <div className="agua-card">
        <div className="agua-card-title">Ajustar meta diária</div>
        {perfil?.peso && (
          <div className="agua-sugestoes">
            <button className="agua-sug-btn" onClick={() => sugerirMeta('sedentario')}>
              <span>🧘 Sedentário</span>
              <strong>{Math.round(perfil.peso * 35).toLocaleString('pt-BR')} ml</strong>
              <small>peso × 35ml</small>
            </button>
            <button className="agua-sug-btn" onClick={() => sugerirMeta('ativo')}>
              <span>🏋️ Ativo</span>
              <strong>{Math.round(perfil.peso * 50).toLocaleString('pt-BR')} ml</strong>
              <small>peso × 50ml</small>
            </button>
          </div>
        )}
        <div className="agua-meta-row">
          <input
            type="number"
            placeholder="Meta personalizada (ml)"
            value={metaInput}
            onChange={e => setMetaInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarMeta() }}
          />
          <button className="agua-btn-salvar" onClick={() => salvarMeta()}>Salvar</button>
        </div>
        {!perfil?.peso && (
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            💡 Cadastre seu peso no Perfil para ver sugestões personalizadas.
          </p>
        )}
      </div>

      {/* Botões rápidos */}
      <div className="agua-card">
        <div className="agua-card-title">Registrar consumo</div>
        <div className="agua-quick-grid">
          {[180, 300, 500, 1000].map(ml => (
            <button key={ml} className="agua-quick-btn" onClick={() => adicionarAgua(ml)}>
              {ml >= 1000 ? '🫙' : ml >= 500 ? '🍶' : ml >= 300 ? '🥤' : '🥃'} {ml}ml
            </button>
          ))}
        </div>
        <div className="agua-custom-row">
          <input
            type="number"
            placeholder="Outro valor (ml)"
            value={customMl}
            onChange={e => setCustomMl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { adicionarAgua(customMl) } }}
          />
          <button className="agua-btn-salvar" onClick={() => adicionarAgua(customMl)}>+ Adicionar</button>
        </div>
      </div>

      {/* Log de hoje */}
      <div className="agua-card">
        <div className="agua-card-title">Registros de hoje</div>
        {registros.length === 0 ? (
          <p className="empty-msg" style={{ marginTop: 8, fontSize: 13 }}>Nenhum registro ainda.</p>
        ) : (
          <div className="agua-log">
            {registros.map(r => (
              <div key={r.id} className="agua-log-item">
                <div className="agua-log-left">
                  <span className="agua-log-ml">+{r.ml} ml</span>
                  <span className="agua-log-hora">{r.hora}</span>
                </div>
                <button className="agua-log-del" onClick={() => deletarRegistro(r.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico 7 dias */}
      <div className="agua-card">
        <div className="agua-card-title">Últimos 7 dias</div>
        <div className="agua-hist">
          {ultimos7.map(data => {
            const regs = historico[data] || []
            const total = regs.reduce((s, r) => s + r.ml, 0)
            const p = Math.min(100, Math.round((total / meta) * 100))
            const d = new Date(data + 'T00:00:00')
            return (
              <div key={data} className="agua-hist-item">
                <span className="agua-hist-data">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                <div className="agua-hist-bar-bg">
                  <div className="agua-hist-bar-fill" style={{ width: `${p}%`, background: p >= 100 ? '#10b981' : '#3b82f6' }} />
                </div>
                <span className="agua-hist-val">{total > 0 ? `${(total/1000).toFixed(1)}L` : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}