import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts'

function formatarData(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function round1(n) { return Math.round(n * 10) / 10 }

const REFEICOES_OPTS = [
  { id: 'cafe',      label: '☀️ Café da manhã'  },
  { id: 'lanche1',   label: '🍎 Lanche da manhã' },
  { id: 'almoco',    label: '🍽️ Almoço'          },
  { id: 'cafetarde', label: '☕ Café da tarde'   },
  { id: 'janta',     label: '🌙 Janta'           },
  { id: 'outro',     label: '⏰ Fora de horário' },
]

function normalizar(t) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }

function calcTMB(perfil) {
  if (!perfil?.peso || !perfil?.altura || !perfil?.idade || !perfil?.sexo) return null
  if (perfil.sexo === 'M') return Math.round(88.36 + (13.4 * Number(perfil.peso)) + (4.8 * Number(perfil.altura)) - (5.7 * Number(perfil.idade)))
  return Math.round(447.6 + (9.2 * Number(perfil.peso)) + (3.1 * Number(perfil.altura)) - (4.3 * Number(perfil.idade)))
}

export default function Macros({ user, onAjuda }) {
  const [registros, setRegistros]         = useState([])
  const [meta, setMeta]                   = useState(2000)
  const [metaInput, setMetaInput]         = useState('')
  const [editandoMeta, setEditandoMeta]   = useState(false)
  const [carregando, setCarregando]       = useState(true)
  const [alimentosBase, setAlimentosBase] = useState([])
  const [customFoods, setCustomFoods]     = useState([])
  const [perfil, setPerfil]               = useState(null)
  const [kcalGasto, setKcalGasto] = useState({ passos: 0, treino: 0 })
  const [historicoKcal, setHistoricoKcal] = useState([])
  const [query, setQuery]                 = useState('')
  const [sugestoes, setSugestoes]         = useState([])
  const [foodSel, setFoodSel]             = useState(null)
  const [gramas, setGramas]               = useState('')
  const [refeicaoSel, setRefeicaoSel]     = useState('cafe')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [novoAlimento, setNovoAlimento]   = useState({ nome: '', kcal: '', prot: '', carb: '', gord: '' })

  const hoje = formatarData(new Date())

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [
      { data: regs },
      { data: metaData },
      { data: customs },
      { data: base },
      { data: perfilData },
            { data: passosHoje },
            { data: treinoHoje },
          ] = await Promise.all([
      supabase.from('macros_registro').select('*').eq('user_id', user.id).eq('data', hoje).order('created_at', { ascending: true }),
      supabase.from('macros_meta').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('alimentos_custom').select('*').eq('user_id', user.id),
      supabase.from('alimentos_base').select('*').order('nome', { ascending: true }),
      supabase.from('perfil').select('*').eq('user_id', user.id).single(),
      supabase.from('passos_registro').select('passos').eq('user_id', user.id).eq('data', hoje).single(),
      supabase.from('treinos_finalizados').select('kcal').eq('user_id', user.id).gte('created_at', hoje).single(),
    ])
    setRegistros(regs || [])
    if (metaData) setMeta(metaData.meta_kcal)
    setCustomFoods(customs || [])
    setAlimentosBase(base || [])
    if (perfilData) setPerfil(perfilData)
        const kcalPassos = Math.round((passosHoje?.passos || 0) * 0.04)
        const kcalTreino = treinoHoje?.kcal || 0
        setKcalGasto({ passos: kcalPassos, treino: kcalTreino })
        const ultimos7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          const offset = d.getTimezoneOffset()
          return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0]
        })
        const inicio = ultimos7[0]
        const { data: histData } = await supabase.from('macros_registro').select('data,kcal').eq('user_id', user.id).gte('data', inicio)
        const hist = ultimos7.map(data => ({
          name: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          kcal: Math.round((histData || []).filter(r => r.data === data).reduce((s, r) => s + r.kcal, 0))
        }))
        setHistoricoKcal(hist)
        setCarregando(false)
          }, [user.id])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  const todosAlimentos = [
    ...alimentosBase,
    ...customFoods.map(f => ({ ...f, custom: true }))
  ]

  const buscarSugestoes = (q) => {
    setQuery(q)
    setFoodSel(null)
    if (!q.trim()) { setSugestoes([]); return }
    const norm = normalizar(q)
    setSugestoes(todosAlimentos.filter(a => normalizar(a.nome).includes(norm)).slice(0, 8))
  }

  const selecionarFood = (food) => {
    setFoodSel(food)
    setQuery(food.nome)
    setSugestoes([])
  }

  const calcMacros = (food, g) => {
    const f = g / 100
    return {
      kcal: Math.round(food.kcal * f),
      prot: round1(food.prot * f),
      carb: round1(food.carb * f),
      gord: round1(food.gord * f),
    }
  }

  const preview = foodSel && gramas ? calcMacros(foodSel, parseFloat(gramas)) : null

  const refeicaoAtualSugerida = () => {
    const h = new Date().getHours()
    if (h >= 5  && h <= 9)  return 'cafe'
    if (h >= 10 && h <= 11) return 'lanche1'
    if (h >= 12 && h <= 13) return 'almoco'
    if (h >= 14 && h <= 17) return 'cafetarde'
    if (h >= 18 && h <= 22) return 'janta'
    return 'outro'
  }

  useEffect(() => { setRefeicaoSel(refeicaoAtualSugerida()) }, [])

  const adicionarAlimento = async () => {
    if (!foodSel) { alert('Selecione um alimento!'); return }
    const g = parseFloat(gramas)
    if (!g || g <= 0) { alert('Digite a quantidade em gramas!'); return }
    const m = calcMacros(foodSel, g)
    const ref = REFEICOES_OPTS.find(r => r.id === refeicaoSel)
    const { data, error } = await supabase.from('macros_registro').insert([{
      user_id: user.id, data: hoje, nome: foodSel.nome,
      gramas: g, refeicao: refeicaoSel, ...m
    }]).select()
    if (error) { alert('Erro: ' + error.message); return }
    setRegistros(prev => [...prev, data[0]])
    setQuery(''); setGramas(''); setFoodSel(null); setSugestoes([])
  }

  const deletarRegistro = async (id) => {
    await supabase.from('macros_registro').delete().eq('id', id)
    setRegistros(prev => prev.filter(r => r.id !== id))
  }

  const salvarMeta = async () => {
    const val = parseInt(metaInput)
    if (!val || val < 500) { alert('Meta inválida!'); return }
    await supabase.from('macros_meta').upsert({ user_id: user.id, meta_kcal: val }, { onConflict: 'user_id' })
    setMeta(val); setMetaInput(''); setEditandoMeta(false)
  }

  const salvarCustom = async () => {
    const { nome, kcal, prot, carb, gord } = novoAlimento
    if (!nome || !kcal) { alert('Preencha nome e calorias!'); return }
    const { data, error } = await supabase.from('alimentos_custom').insert([{
      user_id: user.id, nome, kcal: parseFloat(kcal),
      prot: parseFloat(prot||0), carb: parseFloat(carb||0), gord: parseFloat(gord||0)
    }]).select()
    if (error) { alert('Erro: ' + error.message); return }
    setCustomFoods(prev => [...prev, data[0]])
    setNovoAlimento({ nome: '', kcal: '', prot: '', carb: '', gord: '' })
    setShowCustomForm(false)
  }

  const total = registros.reduce((acc, r) => ({
    kcal: acc.kcal + r.kcal,
    prot: round1(acc.prot + Number(r.prot)),
    carb: round1(acc.carb + Number(r.carb)),
    gord: round1(acc.gord + Number(r.gord)),
  }), { kcal: 0, prot: 0, carb: 0, gord: 0 })

  const pct = Math.min(100, Math.round((total.kcal / meta) * 100))
  const tmb = calcTMB(perfil)

  // Saldo calórico
  const calcSaldo = () => {
    if (!tmb) return null
    const kcalPassos = Math.round((perfil?.passos_hoje || 0) * 0.04)
    return { tmb, kcalPassos, total: total.kcal, saldo: total.kcal - meta }
  }

  // Agrupa registros por refeição
  const porRefeicao = REFEICOES_OPTS.reduce((acc, r) => {
    const itens = registros.filter(reg => reg.refeicao === r.id)
    if (itens.length > 0) acc[r.id] = { label: r.label, itens }
    return acc
  }, {})

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando seus macros... 🍽️</div>

  return (
    <div className="macros-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="title-divisao" style={{ margin: 0 }}>🍽️ Controle de Macros</h2>
        <button className="ajuda-shortcut-btn" onClick={() => onAjuda('ajuda-dieta')}>?</button>
      </div>

      {/* Resumo */}
      <div className="macros-resumo">
        <div className="macros-resumo-top">
          <div>
            <span className="macros-resumo-num">{total.kcal}</span>
            <span className="macros-resumo-unit">kcal</span>
          </div>
          <span className="macros-resumo-meta">{pct}% de {meta} kcal</span>
        </div>
        <div className="macros-bar-bg">
          <div className="macros-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#f59e0b' }} />
        </div>
        <div className="macros-grid-mini">
          <div className="macros-mini-item"><span>🥩 Prot</span><strong>{total.prot}g</strong></div>
          <div className="macros-mini-item"><span>🍞 Carb</span><strong>{total.carb}g</strong></div>
          <div className="macros-mini-item"><span>🧈 Gord</span><strong>{total.gord}g</strong></div>
        </div>
      </div>

      {tmb && (
        <div className="macros-card">
          <div className="macros-card-title">SALDO CALÓRICO DO DIA</div>
              {(() => {
                const gastoTotal = meta + kcalGasto.treino + kcalGasto.passos
                const saldo = total.kcal - gastoTotal
                const maxVal = Math.max(gastoTotal, total.kcal, 1)
                const linhas = [
                  { label: 'Meta base', val: meta, extra: '', color: '#6366f1' },
                  { label: '+ Treino', val: kcalGasto.treino, extra: '', color: '#10b981' },
                  { label: '+ Passos', val: kcalGasto.passos, extra: '', color: '#10b981' },
                  { label: 'Ingerido', val: total.kcal, extra: '', color: total.kcal > gastoTotal ? '#ef4444' : '#f59e0b' },
                ]
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {linhas.map((l, i) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{l.label}</span>
                            <strong style={{ fontSize: 12, color: l.color }}>{l.val.toLocaleString('pt-BR')} kcal</strong>
                          </div>
                          <div className="macros-bar-bg">
                            <div style={{ height: 6, borderRadius: 99, background: l.color, width: `${Math.min(100, Math.round((l.val / maxVal) * 100))}%`, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="macros-saldo-total" style={{ color: saldo < 0 ? '#10b981' : '#ef4444' }}>
                      {saldo < 0
                        ? `Deficit de ${Math.abs(saldo).toLocaleString('pt-BR')} kcal`
                        : `Superavit de ${saldo.toLocaleString('pt-BR')} kcal`}
                    </div>
                  </>
                )
              })()}
        </div>
      )}

       {/* Gráfico kcal 7 dias */}
             {historicoKcal.some(d => d.kcal > 0) && (
               <div className="macros-card">
                 <div className="macros-card-title">KCAL ÚLTIMOS 7 DIAS</div>
                 <ResponsiveContainer width="100%" height={140}>
                   <BarChart data={historicoKcal}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                     <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                     <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                     <Tooltip
                       contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                       formatter={v => [`${v} kcal`]}
                     />
                     <ReferenceLine y={meta} stroke="#f59e0b66" strokeDasharray="4 4" />
                     <Bar dataKey="kcal" radius={[4,4,0,0]}>
                       {historicoKcal.map((d, i) => (
                         <Cell key={i} fill={d.kcal >= meta ? '#10b981' : d.kcal > 0 ? '#f59e0b' : '#24282d'} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
                 <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>— meta: {meta.toLocaleString('pt-BR')} kcal</div>
               </div>
             )}


      {/* TMB */}
      {tmb && (
        <div className="macros-card">
          <div className="macros-card-title">TAXA METABÓLICA BASAL (TMB)</div>
          <div className="macros-tmb-row">
            <div className="macros-tmb-item">
              <span>Repouso</span>
              <strong>{tmb} kcal</strong>
              <small>sem atividade</small>
            </div>
            <div className="macros-tmb-item">
              <span>Leve</span>
              <strong>{Math.round(tmb * 1.375)} kcal</strong>
              <small>1-3x/semana</small>
            </div>
            <div className="macros-tmb-item">
              <span>Moderado</span>
              <strong>{Math.round(tmb * 1.55)} kcal</strong>
              <small>3-5x/semana</small>
            </div>
            <div className="macros-tmb-item">
              <span>Intenso</span>
              <strong>{Math.round(tmb * 1.725)} kcal</strong>
              <small>6-7x/semana</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 10, lineHeight: 1.5 }}>
            💡 Para emagrecer consuma 500–800 kcal abaixo do seu gasto total. Para ganhar massa, 300–500 acima.
          </p>
        </div>
      )}

      {/* Meta calórica */}
      <div className="macros-card">
        <div className="macros-card-title-row">
          <div className="macros-card-title" style={{ margin: 0 }}>META CALÓRICA</div>
          {!editandoMeta && (
            <button className="peso-btn-alterar" onClick={() => setEditandoMeta(true)}>Alterar</button>
          )}
        </div>
        {!editandoMeta ? (
          <div className="macros-meta-display">
            <span className="macros-meta-val">🎯 {meta.toLocaleString('pt-BR')} kcal/dia</span>
            {tmb && (
              <span className="macros-meta-diff" style={{ color: meta < tmb ? '#10b981' : '#64748b' }}>
                {meta < tmb ? `${tmb - meta} kcal abaixo do TMB` : `${meta - tmb} kcal acima do TMB`}
              </span>
            )}
          </div>
        ) : (
          <div className="macros-add-row" style={{ marginTop: 0 }}>
            <input
              type="number"
              placeholder={`Meta atual: ${meta} kcal`}
              value={metaInput}
              onChange={e => setMetaInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarMeta() }}
              autoFocus
            />
            <button className="macros-btn-add" onClick={salvarMeta}>Salvar</button>
            <button className="peso-btn-cancelar" onClick={() => { setEditandoMeta(false); setMetaInput('') }}>✕</button>
          </div>
        )}
      </div>

      {/* Busca alimento */}
      <div className="macros-card">
        <div className="macros-card-title">ADICIONAR ALIMENTO</div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Buscar alimento... (ex: frango, arroz)"
            value={query}
            onChange={e => buscarSugestoes(e.target.value)}
            onFocus={() => query && buscarSugestoes(query)}
            autoComplete="off"
          />
          {sugestoes.length > 0 && (
            <div className="macros-sugestoes">
              {sugestoes.map((s, i) => (
                <div key={i} className="macros-sug-item" onClick={() => selecionarFood(s)}>
                  <span className="macros-sug-nome">{s.nome} {s.custom ? <span style={{ fontSize: 10, color: '#6366f1' }}>personalizado</span> : ''}</span>
                  <span className="macros-sug-info">{s.kcal} kcal | P:{s.prot}g C:{s.carb}g G:{s.gord}g /100g</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="macros-add-row-full">
          <input
            type="number"
            placeholder="Gramas"
            value={gramas}
            onChange={e => setGramas(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') adicionarAlimento() }}
            min="1" max="2000"
            style={{ width: 90, flexShrink: 0 }}
          />
          <select
            className="macros-refeicao-sel"
            value={refeicaoSel}
            onChange={e => setRefeicaoSel(e.target.value)}
          >
            {REFEICOES_OPTS.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <button className="macros-btn-add" onClick={adicionarAlimento}>+ Add</button>
        </div>
        {preview && (
          <div className="macros-preview">
            ⚡ {preview.kcal} kcal &nbsp;|&nbsp; 🥩 {preview.prot}g &nbsp;|&nbsp; 🍞 {preview.carb}g &nbsp;|&nbsp; 🧈 {preview.gord}g
          </div>
        )}
      </div>

      {/* Alimentos personalizados */}
      <div className="macros-card">
        <div className="macros-card-title-row">
          <div className="macros-card-title" style={{ margin: 0 }}>ALIMENTOS PERSONALIZADOS</div>
          <button className="macros-btn-custom" onClick={() => setShowCustomForm(!showCustomForm)}>
            {showCustomForm ? '✕' : '+ Novo'}
          </button>
        </div>
        {showCustomForm && (
          <div className="macros-custom-form">
            <input type="text" placeholder="Nome do alimento" value={novoAlimento.nome} onChange={e => setNovoAlimento(p => ({ ...p, nome: e.target.value }))} />
            <div className="macros-custom-grid">
              <div><label>kcal/100g</label><input type="number" value={novoAlimento.kcal} onChange={e => setNovoAlimento(p => ({ ...p, kcal: e.target.value }))} /></div>
              <div><label>Prot (g)</label><input type="number" value={novoAlimento.prot} onChange={e => setNovoAlimento(p => ({ ...p, prot: e.target.value }))} /></div>
              <div><label>Carb (g)</label><input type="number" value={novoAlimento.carb} onChange={e => setNovoAlimento(p => ({ ...p, carb: e.target.value }))} /></div>
              <div><label>Gord (g)</label><input type="number" value={novoAlimento.gord} onChange={e => setNovoAlimento(p => ({ ...p, gord: e.target.value }))} /></div>
            </div>
            <button className="macros-btn-add" onClick={salvarCustom}>Salvar alimento</button>
          </div>
        )}
        {customFoods.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customFoods.map(f => (
              <div key={f.id} className="macros-custom-item">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{f.kcal} kcal · P:{f.prot}g C:{f.carb}g G:{f.gord}g</div>
                </div>
                <button className="supl-del-btn" onClick={async () => {
                  await supabase.from('alimentos_custom').delete().eq('id', f.id)
                  setCustomFoods(prev => prev.filter(x => x.id !== f.id))
                }}>×</button>
              </div>
            ))}
          </div>
        )}
        {customFoods.length === 0 && !showCustomForm && (
          <p style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>Nenhum alimento personalizado ainda.</p>
        )}
      </div>

      {/* Log agrupado por refeição */}
      <div className="macros-card">
        <div className="macros-card-title-row">
          <div className="macros-card-title" style={{ margin: 0 }}>REFEIÇÕES DE HOJE</div>
          {registros.length > 0 && (
            <button className="macros-btn-limpar" onClick={async () => {
              if (!confirm('Zerar todos os registros de hoje?')) return
              await supabase.from('macros_registro').delete().eq('user_id', user.id).eq('data', hoje)
              setRegistros([])
            }}>Zerar dia</button>
          )}
        </div>
        {registros.length === 0 ? (
          <p className="empty-msg" style={{ marginTop: 8, fontSize: 13 }}>Nenhum alimento registrado ainda.</p>
        ) : (
          Object.entries(porRefeicao).map(([id, { label, itens }]) => {
            const totalRef = itens.reduce((a, r) => ({ kcal: a.kcal + r.kcal, prot: round1(a.prot + Number(r.prot)), carb: round1(a.carb + Number(r.carb)), gord: round1(a.gord + Number(r.gord)) }), { kcal: 0, prot: 0, carb: 0, gord: 0 })
            return (
              <div key={id} style={{ marginBottom: 16 }}>
                <div className="macros-ref-header">
                  <span className="macros-ref-label">{label}</span>
                  <span className="macros-ref-total">{totalRef.kcal} kcal</span>
                </div>
                {itens.map(r => (
                  <div key={r.id} className="macros-log-item">
                    <div className="macros-log-top">
                      <span className="macros-log-nome">{r.nome} <span style={{ color: '#64748b', fontWeight: 400 }}>({r.gramas}g)</span></span>
                      <button className="agua-log-del" onClick={() => deletarRegistro(r.id)}>✕</button>
                    </div>
                    <div className="macros-log-vals">
                      <span>⚡ {r.kcal}</span>
                      <span>🥩 {r.prot}g</span>
                      <span>🍞 {r.carb}g</span>
                      <span>🧈 {r.gord}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}