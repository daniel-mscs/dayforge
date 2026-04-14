import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

function formatarData(date) {
  return date.toISOString().split('T')[0]
}

function round1(n) { return Math.round(n * 10) / 10 }

const ALIMENTOS_BASE = [
  { nome: 'Arroz branco cozido',     kcal: 128, prot: 2.5,  carb: 28.1, gord: 0.2  },
  { nome: 'Arroz integral cozido',   kcal: 124, prot: 2.6,  carb: 25.8, gord: 1.0  },
  { nome: 'Batata doce cozida',      kcal: 77,  prot: 1.4,  carb: 18.4, gord: 0.1  },
  { nome: 'Batata inglesa cozida',   kcal: 56,  prot: 1.6,  carb: 13.0, gord: 0.1  },
  { nome: 'Macarrão cozido',         kcal: 130, prot: 4.3,  carb: 26.4, gord: 0.9  },
  { nome: 'Pão francês',             kcal: 300, prot: 8.0,  carb: 58.6, gord: 3.1  },
  { nome: 'Aveia em flocos',         kcal: 394, prot: 13.9, carb: 67.0, gord: 8.5  },
  { nome: 'Feijão cozido',           kcal: 76,  prot: 4.8,  carb: 13.5, gord: 0.5  },
  { nome: 'Frango grelhado (peito)', kcal: 159, prot: 32.0, carb: 0.0,  gord: 2.7  },
  { nome: 'Frango cozido (coxa)',    kcal: 191, prot: 26.0, carb: 0.0,  gord: 9.3  },
  { nome: 'Carne bovina patinho',    kcal: 219, prot: 21.0, carb: 0.0,  gord: 14.5 },
  { nome: 'Carne moída (patinho)',   kcal: 189, prot: 26.0, carb: 0.0,  gord: 9.5  },
  { nome: 'Tilápia grelhada',        kcal: 128, prot: 26.2, carb: 0.0,  gord: 2.7  },
  { nome: 'Salmão grelhado',         kcal: 208, prot: 20.0, carb: 0.0,  gord: 13.4 },
  { nome: 'Atum em lata (água)',     kcal: 109, prot: 24.4, carb: 0.0,  gord: 0.9  },
  { nome: 'Ovo inteiro cozido',      kcal: 155, prot: 12.6, carb: 1.1,  gord: 10.6 },
  { nome: 'Clara de ovo',            kcal: 52,  prot: 11.0, carb: 0.7,  gord: 0.2  },
  { nome: 'Whey protein',            kcal: 370, prot: 75.0, carb: 9.0,  gord: 4.0  },
  { nome: 'Iogurte grego natural',   kcal: 97,  prot: 9.0,  carb: 3.6,  gord: 5.0  },
  { nome: 'Leite em pó integral',    kcal: 496, prot: 24.6, carb: 39.4, gord: 26.3 },
  { nome: 'Banana nanica',           kcal: 89,  prot: 1.1,  carb: 22.8, gord: 0.3  },
  { nome: 'Maçã',                    kcal: 56,  prot: 0.3,  carb: 15.2, gord: 0.1  },
  { nome: 'Azeite de oliva',         kcal: 884, prot: 0.0,  carb: 0.0,  gord: 100.0},
  { nome: 'Amendoim torrado',        kcal: 567, prot: 25.8, carb: 16.1, gord: 49.2 },
  { nome: 'Brócolis cozido',         kcal: 35,  prot: 2.4,  carb: 6.6,  gord: 0.4  },
  { nome: 'Cenoura crua',            kcal: 34,  prot: 0.9,  carb: 7.9,  gord: 0.2  },
  { nome: 'Salada (folhas mistas)',  kcal: 17,  prot: 1.3,  carb: 2.9,  gord: 0.2  },
]

function normalizar(t) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }

export default function Macros({ user }) {
  const [registros, setRegistros]       = useState([])
  const [meta, setMeta]                 = useState(2000)
  const [metaInput, setMetaInput]       = useState('')
  const [carregando, setCarregando]     = useState(true)
  const [customFoods, setCustomFoods]   = useState([])
  const [query, setQuery]               = useState('')
  const [sugestoes, setSugestoes]       = useState([])
  const [foodSel, setFoodSel]           = useState(null)
  const [gramas, setGramas]             = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [novoAlimento, setNovoAlimento] = useState({ nome: '', kcal: '', prot: '', carb: '', gord: '' })

  const hoje = formatarData(new Date())

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [{ data: regs }, { data: metaData }, { data: customs }] = await Promise.all([
      supabase.from('macros_registro').select('*').eq('user_id', user.id).eq('data', hoje).order('created_at', { ascending: false }),
      supabase.from('macros_meta').select('*').eq('user_id', user.id).single(),
      supabase.from('alimentos_custom').select('*').eq('user_id', user.id),
    ])
    setRegistros(regs || [])
    if (metaData) setMeta(metaData.meta_kcal)
    setCustomFoods(customs || [])
    setCarregando(false)
  }, [user.id])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  const todosAlimentos = [...ALIMENTOS_BASE, ...customFoods]

  const buscarSugestoes = (q) => {
    setQuery(q)
    setFoodSel(null)
    if (!q.trim()) { setSugestoes([]); return }
    const norm = normalizar(q)
    setSugestoes(todosAlimentos.filter(a => normalizar(a.nome).includes(norm)).slice(0, 6))
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

  const adicionarAlimento = async () => {
    if (!foodSel) { alert('Selecione um alimento!'); return }
    const g = parseFloat(gramas)
    if (!g || g <= 0) { alert('Digite a quantidade em gramas!'); return }
    const m = calcMacros(foodSel, g)
    const { data, error } = await supabase.from('macros_registro').insert([{
      user_id: user.id, data: hoje, nome: foodSel.nome, gramas: g, ...m
    }]).select()
    if (error) { alert('Erro: ' + error.message); return }
    setRegistros(prev => [data[0], ...prev])
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
    setMeta(val); setMetaInput('')
  }

  const salvarCustom = async () => {
    const { nome, kcal, prot, carb, gord } = novoAlimento
    if (!nome || !kcal) { alert('Preencha nome e calorias!'); return }
    const { data, error } = await supabase.from('alimentos_custom').insert([{
      user_id: user.id, nome, kcal: parseFloat(kcal), prot: parseFloat(prot||0),
      carb: parseFloat(carb||0), gord: parseFloat(gord||0)
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

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando...</div>

  return (
    <div className="macros-section">
      <h2 className="title-divisao">🍽️ Controle de Macros</h2>

      {/* Resumo do dia */}
      <div className="macros-resumo">
        <div className="macros-resumo-top">
          <div className="macros-resumo-kcal">
            <span className="macros-resumo-num">{total.kcal}</span>
            <span className="macros-resumo-unit">kcal</span>
          </div>
          <span className="macros-resumo-meta">{pct}% de {meta} kcal</span>
        </div>
        <div className="macros-bar-bg">
          <div className="macros-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#f59e0b' }} />
        </div>
        <div className="macros-grid-mini">
          <div className="macros-mini-item">
            <span>🥩 Prot</span><strong>{total.prot}g</strong>
          </div>
          <div className="macros-mini-item">
            <span>🍞 Carb</span><strong>{total.carb}g</strong>
          </div>
          <div className="macros-mini-item">
            <span>🧈 Gord</span><strong>{total.gord}g</strong>
          </div>
        </div>
      </div>

      {/* Busca alimento */}
      <div className="macros-card">
        <div className="macros-card-title">ADICIONAR ALIMENTO</div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={query}
            onChange={e => buscarSugestoes(e.target.value)}
            onFocus={() => query && buscarSugestoes(query)}
            autoComplete="off"
          />
          {sugestoes.length > 0 && (
            <div className="macros-sugestoes">
              {sugestoes.map((s, i) => (
                <div key={i} className="macros-sug-item" onClick={() => selecionarFood(s)}>
                  <span className="macros-sug-nome">{s.nome}</span>
                  <span className="macros-sug-info">{s.kcal} kcal | P:{s.prot}g C:{s.carb}g G:{s.gord}g</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="macros-add-row">
          <input
            type="number"
            placeholder="Quantidade (g)"
            value={gramas}
            onChange={e => setGramas(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') adicionarAlimento() }}
            min="1" max="2000"
          />
          <button className="macros-btn-add" onClick={adicionarAlimento}>+ Adicionar</button>
        </div>
        {preview && (
          <div className="macros-preview">
            ⚡ {preview.kcal} kcal &nbsp;|&nbsp; 🥩 {preview.prot}g &nbsp;|&nbsp; 🍞 {preview.carb}g &nbsp;|&nbsp; 🧈 {preview.gord}g
          </div>
        )}
      </div>

      {/* Meta calórica */}
      <div className="macros-card">
        <div className="macros-card-title">META CALÓRICA</div>
        <div className="macros-add-row">
          <input
            type="number"
            placeholder={`Meta atual: ${meta} kcal`}
            value={metaInput}
            onChange={e => setMetaInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarMeta() }}
          />
          <button className="macros-btn-add" onClick={salvarMeta}>Salvar</button>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
          💡 Para emagrecer consuma ~500 kcal abaixo do seu gasto diário.
        </p>
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
      </div>

      {/* Log de hoje */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {registros.map(r => (
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
        )}
      </div>
    </div>
  )
}