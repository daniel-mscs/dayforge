import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function formatarData(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function calcularIMC(peso, alturaCm) {
  if (!peso || !alturaCm) return null
  const h = alturaCm / 100
  return (peso / (h * h)).toFixed(1)
}

function classificarIMC(imc) {
  if (imc < 18.5) return { label: 'Abaixo do peso', color: '#85B7EB' }
  if (imc < 25)   return { label: 'Normal',          color: '#10b981' }
  if (imc < 30)   return { label: 'Sobrepeso',       color: '#fbbf24' }
  if (imc < 35)   return { label: 'Obesidade I',     color: '#f97316' }
  return               { label: 'Obesidade II+',    color: '#ef4444' }
}

function imcBarPct(imc) {
  const min = 15, max = 40
  return Math.min(100, Math.max(0, ((imc - min) / (max - min)) * 100))
}

export default function Peso({ user, onAjuda }) {
  const [registros, setRegistros]     = useState([])
  const [perfil, setPerfil]           = useState(null)
  const [pesoInput, setPesoInput]     = useState('')
  const [metaInput, setMetaInput]     = useState('')
  const [meta, setMeta]               = useState(null)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [carregando, setCarregando]   = useState(true)

  const hoje = formatarData(new Date())

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [{ data: regs }, { data: perfilData }] = await Promise.all([
      supabase.from('peso_registro').select('*').eq('user_id', user.id).order('data', { ascending: false }).limit(30),
      supabase.from('perfil').select('*').eq('user_id', user.id).single(),
    ])
    setRegistros(regs || [])
    if (perfilData) {
      setPerfil(perfilData)
      setMeta(perfilData.meta_peso || null)
    }
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  const registrarPeso = async () => {
    const val = parseFloat(pesoInput)
    if (!val || val < 30 || val > 300) { alert('Digite um peso válido!'); return }

    const existing = registros.find(r => r.data === hoje)
    if (existing) {
      if (!confirm('Já existe um registro hoje. Substituir?')) return
      const { error } = await supabase.from('peso_registro').update({ peso: val }).eq('id', existing.id)
      if (error) { alert('Erro: ' + error.message); return }
      setRegistros(prev => prev.map(r => r.id === existing.id ? { ...r, peso: val } : r))
    } else {
      const { data, error } = await supabase.from('peso_registro').insert([{
        user_id: user.id, data: hoje, peso: val
      }]).select()
      if (error) { alert('Erro: ' + error.message); return }
      setRegistros(prev => [data[0], ...prev])
    }

    await supabase.from('perfil').upsert({ user_id: user.id, peso: val }, { onConflict: 'user_id' })
    setPerfil(prev => ({ ...prev, peso: val }))
    setPesoInput('')
  }

  const deletarRegistro = async (id) => {
    await supabase.from('peso_registro').delete().eq('id', id)
    setRegistros(prev => prev.filter(r => r.id !== id))
  }

  const salvarMeta = async () => {
    const val = parseFloat(metaInput)
    if (!val || val < 30) { alert('Meta inválida!'); return }
    await supabase.from('perfil').upsert({ user_id: user.id, meta_peso: val }, { onConflict: 'user_id' })
    setMeta(val)
    setMetaInput('')
    setEditandoMeta(false)
  }

  const mediaSemana = () => {
    const ultimos7 = registros.filter(r => {
      const diff = (new Date(hoje) - new Date(r.data)) / 86400000
      return diff <= 6
    })
    if (ultimos7.length === 0) return null
    return (ultimos7.reduce((s, r) => s + Number(r.peso), 0) / ultimos7.length).toFixed(1)
  }

  const dadosGrafico = [...registros].reverse().slice(-14).map(r => ({
    data: new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: Number(r.peso)
  }))

  const ultimo    = registros[0] || null
  const penultimo = registros[1] || null
  const imc       = ultimo && perfil?.altura ? calcularIMC(Number(ultimo.peso), Number(perfil.altura)) : null
  const imcCls    = imc ? classificarIMC(Number(imc)) : null
  const media     = mediaSemana()
  const diff      = ultimo && penultimo ? (Number(ultimo.peso) - Number(penultimo.peso)).toFixed(1) : null
  const diffMeta  = ultimo && meta ? (Number(ultimo.peso) - meta).toFixed(1) : null
  const pesoIdeal = perfil?.altura ? (() => {
    const h = perfil.altura / 100
    return { min: (22 * h * h).toFixed(1), max: (24 * h * h).toFixed(1) }
  })() : null

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando seu peso... ⚖️</div>

  return (
    <div className="peso-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="title-divisao" style={{ margin: 0 }}>⚖️ Controle de Peso</h2>
        <button className="ajuda-shortcut-btn" onClick={() => onAjuda('ajuda-peso')}>?</button>
      </div>

      {/* Cards principais */}
      <div className="peso-cards-grid">
        <div className="peso-stat-card">
          <div className="peso-stat-label">PESO ATUAL</div>
          <div className="peso-stat-val">{ultimo ? `${Number(ultimo.peso).toFixed(1)} kg` : '—'}</div>
          {diff !== null && (
            <div className="peso-stat-sub" style={{ color: Number(diff) < 0 ? '#10b981' : Number(diff) > 0 ? '#ef4444' : '#64748b' }}>
              {Number(diff) > 0 ? '▲' : Number(diff) < 0 ? '▼' : '='} {Math.abs(diff)} kg
            </div>
          )}
        </div>
        <div className="peso-stat-card">
          <div className="peso-stat-label">IMC</div>
          <div className="peso-stat-val" style={{ color: imcCls?.color }}>{imc || '—'}</div>
          <div className="peso-stat-sub">{imcCls?.label || (perfil?.altura ? 'Registre um peso' : 'Configure altura')}</div>
        </div>
        <div className="peso-stat-card">
          <div className="peso-stat-label">MÉDIA 7 DIAS</div>
          <div className="peso-stat-val">{media ? `${media} kg` : '—'}</div>
          <div className="peso-stat-sub">{registros.filter(r => (new Date(hoje) - new Date(r.data)) / 86400000 <= 6).length} registros</div>
        </div>
        <div className="peso-stat-card">
          <div className="peso-stat-label">PESO IDEAL</div>
          <div className="peso-stat-val" style={{ fontSize: '1rem' }}>{pesoIdeal ? `${pesoIdeal.min}–${pesoIdeal.max}` : '—'}</div>
          <div className="peso-stat-sub">IMC 22–24</div>
        </div>
      </div>

      {/* Gráfico */}
      {dadosGrafico.length >= 2 && (
        <div className="peso-card">
          <div className="peso-card-title">EVOLUÇÃO DO PESO</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="data" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                domain={['auto', 'auto']}
                tickFormatter={v => `${v}kg`}
              />
              <Tooltip
                contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc' }}
                formatter={v => [`${v} kg`]}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6 }}
              />
              {meta && (
                <Line
                  type="monotone"
                  dataKey={() => meta}
                  stroke="#10b98166"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Meta"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          {meta && <div style={{ fontSize: 11, color: '#10b981', textAlign: 'right', marginTop: 4 }}>— — Meta: {meta} kg</div>}
        </div>
      )}

      {/* Barra IMC */}
      {imc && (
        <div className="peso-card">
          <div className="peso-card-title">FAIXA DE IMC</div>
          <div className="peso-imc-track">
            <div style={{ width: '13%', background: '#85B7EB' }} />
            <div style={{ width: '22%', background: '#10b981' }} />
            <div style={{ width: '20%', background: '#fbbf24' }} />
            <div style={{ width: '20%', background: '#f97316' }} />
            <div style={{ width: '25%', background: '#ef4444' }} />
          </div>
          <div className="peso-imc-marker-wrap">
            <div className="peso-imc-marker" style={{ left: `${imcBarPct(Number(imc))}%` }}>
              ▲ {imc}
            </div>
          </div>
          <div className="peso-imc-labels">
            <span>Abaixo</span><span>Normal</span><span>Sobre</span><span>Ob.I</span><span>Ob.II+</span>
          </div>
        </div>
      )}

      {/* Meta de peso */}
      <div className="peso-card">
        <div className="peso-card-title-row">
          <div className="peso-card-title" style={{ margin: 0 }}>META DE PESO</div>
          {meta && !editandoMeta && (
            <button className="peso-btn-alterar" onClick={() => setEditandoMeta(true)}>Alterar</button>
          )}
        </div>

        {meta && !editandoMeta ? (
          <div className="peso-meta-display">
            <div className="peso-meta-val">🎯 {meta} kg</div>
            {diffMeta !== null && (
              Number(diffMeta) <= 0
                ? <span className="peso-meta-badge done">✅ Meta atingida!</span>
                : <span className="peso-meta-badge">Faltam {diffMeta} kg</span>
            )}
          </div>
        ) : (
          <div className="peso-input-row" style={{ marginTop: meta ? 12 : 0 }}>
            <input
              type="number"
              placeholder={meta ? `Meta atual: ${meta} kg` : 'Ex: 75.0'}
              step="0.1"
              min="30"
              max="300"
              value={metaInput}
              onChange={e => setMetaInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarMeta() }}
              autoFocus={editandoMeta}
            />
            <span className="peso-unit">kg</span>
            <button className="peso-btn-add" onClick={salvarMeta}>Salvar</button>
            {editandoMeta && (
              <button className="peso-btn-cancelar" onClick={() => { setEditandoMeta(false); setMetaInput('') }}>✕</button>
            )}
          </div>
        )}
      </div>

      {/* Registrar hoje */}
      <div className="peso-card">
        <div className="peso-card-title">REGISTRAR HOJE</div>
        <div className="peso-input-row">
          <input
            type="number"
            placeholder="Ex: 80.5"
            step="0.1"
            min="30"
            max="300"
            value={pesoInput}
            onChange={e => setPesoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') registrarPeso() }}
          />
          <span className="peso-unit">kg</span>
          <button className="peso-btn-add" onClick={registrarPeso}>+ Registrar</button>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
          💡 Pese-se sempre em jejum logo ao acordar para resultados consistentes.
        </p>
      </div>

      {/* Média semanal */}
      {media && (
        <div className="peso-card">
          <div className="peso-card-title">MÉDIA SEMANAL</div>
          <div className="peso-media-val">{media} <span>kg</span></div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
            A média dos últimos 7 dias elimina oscilações de retenção hídrica e resíduo gástrico. Use ela para saber se realmente emagreceu ou engordou na semana.
          </p>
        </div>
      )}

      {/* Histórico */}
      <div className="peso-card">
        <div className="peso-card-title">HISTÓRICO</div>
        {registros.length === 0 ? (
          <p className="empty-msg" style={{ marginTop: 8, fontSize: 13 }}>Nenhum registro ainda.</p>
        ) : (
          <div className="peso-log">
            {registros.map((r, idx) => {
              const prev = registros[idx + 1]
              const d = prev ? (Number(r.peso) - Number(prev.peso)).toFixed(1) : null
              return (
                <div key={r.id} className="peso-log-item">
                  <div className="peso-log-left">
                    <span className="peso-log-val">{Number(r.peso).toFixed(1)} kg</span>
                    <span className="peso-log-data">{new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    {d !== null && (
                      <span style={{ fontSize: 11, color: Number(d) < 0 ? '#10b981' : Number(d) > 0 ? '#ef4444' : '#64748b' }}>
                        {Number(d) > 0 ? '▲' : Number(d) < 0 ? '▼' : '='} {Math.abs(d)} kg
                      </span>
                    )}
                  </div>
                  <button className="agua-log-del" onClick={() => deletarRegistro(r.id)}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}