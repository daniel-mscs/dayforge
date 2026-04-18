import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const INVEST_TIPOS = ['Caixinha / CDB', 'Bolsa de Valores', 'Reserva de Emergência']

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SmartPocket({ user }) {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [aba, setAba] = useState('gastos')
  const [carregando, setCarregando] = useState(true)

  const [gastos, setGastos] = useState([])
  const [cartao, setCartao] = useState([])
  const [investimentos, setInvestimentos] = useState([])
  const [entradas, setEntradas] = useState([])

  const [gastoNome, setGastoNome] = useState('')
  const [gastoValor, setGastoValor] = useState('')
  const [gastoData, setGastoData] = useState('')

  const [cartaoItem, setCartaoItem] = useState('')
  const [cartaoValor, setCartaoValor] = useState('')

  const [investTipo, setInvestTipo] = useState(INVEST_TIPOS[0])
  const [investValor, setInvestValor] = useState('')

  const [entradaNome, setEntradaNome] = useState('')
  const [entradaValor, setEntradaValor] = useState('')

  const buscarTudo = useCallback(async () => {
    setCarregando(true)
    const [
      { data: g },
      { data: c },
      { data: i },
      { data: e },
    ] = await Promise.all([
      supabase.from('financeiro_gastos').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).order('created_at', { ascending: false }),
      supabase.from('financeiro_cartao').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).order('created_at', { ascending: false }),
      supabase.from('financeiro_investimentos').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).order('created_at', { ascending: false }),
      supabase.from('financeiro_entradas').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).order('created_at', { ascending: false }),
    ])
    setGastos(g || [])
    setCartao(c || [])
    setInvestimentos(i || [])
    setEntradas(e || [])
    setCarregando(false)
  }, [user.id, mes, ano])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  const adicionarGasto = async () => {
    if (!gastoNome || !gastoValor) return alert('Preencha os campos!')
    const { data, error } = await supabase.from('financeiro_gastos').insert([{
      user_id: user.id, mes, ano, nome: gastoNome, valor: parseFloat(gastoValor), data: gastoData || null
    }]).select()
    if (error) return alert(error.message)
    setGastos(prev => [data[0], ...prev])
    setGastoNome(''); setGastoValor(''); setGastoData('')
  }

  const adicionarCartao = async () => {
    if (!cartaoItem || !cartaoValor) return alert('Preencha os campos!')
    const { data, error } = await supabase.from('financeiro_cartao').insert([{
      user_id: user.id, mes, ano, item: cartaoItem, valor: parseFloat(cartaoValor)
    }]).select()
    if (error) return alert(error.message)
    setCartao(prev => [data[0], ...prev])
    setCartaoItem(''); setCartaoValor('')
  }

  const adicionarInvestimento = async () => {
    if (!investValor) return alert('Informe o valor!')
    const { data, error } = await supabase.from('financeiro_investimentos').insert([{
      user_id: user.id, mes, ano, tipo: investTipo, valor: parseFloat(investValor)
    }]).select()
    if (error) return alert(error.message)
    setInvestimentos(prev => [data[0], ...prev])
    setInvestValor('')
  }

  const adicionarEntrada = async () => {
    if (!entradaNome || !entradaValor) return alert('Preencha os campos!')
    const { data, error } = await supabase.from('financeiro_entradas').insert([{
      user_id: user.id, mes, ano, nome: entradaNome, valor: parseFloat(entradaValor)
    }]).select()
    if (error) return alert(error.message)
    setEntradas(prev => [data[0], ...prev])
    setEntradaNome(''); setEntradaValor('')
  }

  const deletar = async (tabela, id, setter) => {
    await supabase.from(tabela).delete().eq('id', id)
    setter(prev => prev.filter(r => r.id !== id))
  }

  const totalGastos = gastos.reduce((s, r) => s + Number(r.valor), 0)
  const totalCartao = cartao.reduce((s, r) => s + Number(r.valor), 0)
  const totalInvest = investimentos.reduce((s, r) => s + Number(r.valor), 0)
  const totalEntradas = entradas.reduce((s, r) => s + Number(r.valor), 0)
  const saldo = totalEntradas - (totalGastos + totalInvest)

  const dadosGrafico = [
    { name: 'Entradas', valor: totalEntradas, fill: '#10b981' },
    { name: 'Gastos', valor: totalGastos, fill: '#ef4444' },
    { name: 'Cartão', valor: totalCartao, fill: '#f97316' },
    { name: 'Invest.', valor: totalInvest, fill: '#f59e0b' },
  ]

  const s = { color: '#f8fafc', fontSize: 16 }

  if (carregando) return <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>Carregando SmartPocket... 💰</div>

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="title-divisao" style={{ margin: 0 }}>💰 SmartPocket</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 12, padding: '6px 10px' }}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 12, padding: '6px 10px' }}>
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'ENTRADAS', val: totalEntradas, color: '#10b981' },
          { label: 'GASTOS', val: totalGastos, color: '#ef4444' },
          { label: 'INVESTIDO', val: totalInvest, color: '#f59e0b' },
          { label: 'SALDO', val: saldo, color: saldo >= 0 ? '#10b981' : '#ef4444' },
        ].map((c, i) => (
          <div key={i} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{fmtBRL(c.val)}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {(totalEntradas > 0 || totalGastos > 0) && (
        <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>VISÃO GERAL — {MESES[mes].toUpperCase()}</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                formatter={v => [fmtBRL(v)]}
              />
              <Bar dataKey="valor" radius={[4,4,0,0]}>
                              {dadosGrafico.map((d, i) => (
                                <Cell key={i} fill={d.fill} />
                              ))}
                            </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: 6, background: '#1a1d21', padding: 5, borderRadius: 12 }}>
        {[
          { id: 'gastos', label: '💸 Gastos' },
          { id: 'cartao', label: '💳 Cartão' },
          { id: 'invest', label: '📈 Invest' },
          { id: 'entradas', label: '💰 Entradas' },
          { id: 'resumo', label: '📊 Resumo' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, background: aba === a.id ? '#24282d' : 'transparent',
            border: 'none', borderRadius: 8, color: aba === a.id ? '#f8fafc' : '#64748b',
            fontSize: 10, fontWeight: 600, padding: '8px 2px', cursor: 'pointer'
          }}>{a.label}</button>
        ))}
      </div>

      {/* ABA GASTOS */}
      {aba === 'gastos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>ADICIONAR GASTO</div>
            <input placeholder="Descrição (ex: Aluguel)" value={gastoNome} onChange={e => setGastoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && document.getElementById('gasto-valor')?.focus()} />
            <input id="gasto-valor" type="number" placeholder="Valor R$" value={gastoValor} onChange={e => setGastoValor(e.target.value)} style={{ marginTop: 8 }} onKeyDown={e => e.key === 'Enter' && adicionarGasto()} />
            <input type="date" value={gastoData} onChange={e => setGastoData(e.target.value)} style={{ marginTop: 8, width: '100%', background: '#24282d', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 14, padding: '10px 12px', boxSizing: 'border-box' }} />
            <button onClick={adicionarGasto} style={{ marginTop: 10, width: '100%', background: '#ef4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer' }}>
              + Adicionar Gasto
            </button>
          </div>
          {gastos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Nenhum gasto registrado.</p>
          ) : gastos.map(g => (
            <div key={g.id} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderLeft: '3px solid #ef4444', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{g.nome}</div>
                {g.data && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📅 {new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{fmtBRL(g.valor)}</span>
                <button onClick={() => deletar('financeiro_gastos', g.id, setGastos)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: 16 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA CARTÃO */}
      {aba === 'cartao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>LANÇAR NO CARTÃO</div>
            <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b33', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#f59e0b', lineHeight: 1.5 }}>
              ⚠️ O cartão não é contabilizado no saldo. Quando chegar a fatura, registre o total na aba <strong>Gastos</strong>.
            </div>
            <input placeholder="O que comprou?" value={cartaoItem} onChange={e => setCartaoItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && document.getElementById('cartao-valor')?.focus()} />
            <input id="cartao-valor" type="number" placeholder="Valor R$" value={cartaoValor} onChange={e => setCartaoValor(e.target.value)} style={{ marginTop: 8 }} onKeyDown={e => e.key === 'Enter' && adicionarCartao()} />
            <button onClick={adicionarCartao} style={{ marginTop: 10, width: '100%', background: '#f97316', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer' }}>
              + Lançar no Cartão
            </button>
          </div>
          {cartao.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Nenhum lançamento no cartão.</p>
          ) : cartao.map(c => (
            <div key={c.id} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderLeft: '3px solid #f97316', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{c.item}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>💳 Crédito</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f97316' }}>{fmtBRL(c.valor)}</span>
                <button onClick={() => deletar('financeiro_cartao', c.id, setCartao)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: 16 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA INVEST */}
      {aba === 'invest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>REGISTRAR INVESTIMENTO</div>
            <select value={investTipo} onChange={e => setInvestTipo(e.target.value)}
              style={{ width: '100%', background: '#24282d', border: '1px solid #ffffff0d', borderRadius: 8, color: '#f8fafc', fontSize: 14, padding: '10px 12px' }}>
              {INVEST_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" placeholder="Valor R$" value={investValor} onChange={e => setInvestValor(e.target.value)} style={{ marginTop: 8 }} onKeyDown={e => e.key === 'Enter' && adicionarInvestimento()} />
            <button onClick={adicionarInvestimento} style={{ marginTop: 10, width: '100%', background: '#f59e0b', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer' }}>
              + Salvar Investimento
            </button>
          </div>
          {investimentos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Nenhum investimento registrado.</p>
          ) : investimentos.map(i => (
            <div key={i.id} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderLeft: '3px solid #f59e0b', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>📈 {i.tipo}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>{fmtBRL(i.valor)}</span>
                <button onClick={() => deletar('financeiro_investimentos', i.id, setInvestimentos)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: 16 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA ENTRADAS */}
      {aba === 'entradas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>REGISTRAR ENTRADA</div>
            <input placeholder="Origem (ex: Salário)" value={entradaNome} onChange={e => setEntradaNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && document.getElementById('entrada-valor')?.focus()} />
            <input id="entrada-valor" type="number" placeholder="Valor R$" value={entradaValor} onChange={e => setEntradaValor(e.target.value)} style={{ marginTop: 8 }} onKeyDown={e => e.key === 'Enter' && adicionarEntrada()} />
            <button onClick={adicionarEntrada} style={{ marginTop: 10, width: '100%', background: '#10b981', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer' }}>
              + Adicionar Entrada
            </button>
          </div>
          {entradas.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Nenhuma entrada registrada.</p>
          ) : entradas.map(e => (
            <div key={e.id} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderLeft: '3px solid #10b981', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>💰 {e.nome}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{fmtBRL(e.valor)}</span>
                <button onClick={() => deletar('financeiro_entradas', e.id, setEntradas)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: 16 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA RESUMO */}
      {aba === 'resumo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d21', border: `1px solid ${saldo >= 0 ? '#10b98144' : '#ef444444'}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>BALANÇO DE {MESES[mes].toUpperCase()}/{ano}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: saldo >= 0 ? '#10b981' : '#ef4444' }}>{fmtBRL(saldo)}</div>
            <div style={{ fontSize: 12, color: saldo >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>{saldo >= 0 ? '✅ Você está no positivo!' : '⚠️ Você está no negativo!'}</div>
          </div>

          {[
            { label: '💰 Total de Entradas', val: totalEntradas, color: '#10b981', items: entradas.map(e => ({ nome: e.nome, val: e.valor })) },
            { label: '💸 Total de Gastos', val: totalGastos, color: '#ef4444', items: gastos.map(g => ({ nome: g.nome, val: g.valor, data: g.data })) },
            { label: '💳 Cartão (não contabilizado)', val: totalCartao, color: '#64748b', items: cartao.map(c => ({ nome: c.item, val: c.valor })) },
            { label: '📈 Total Investido', val: totalInvest, color: '#f59e0b', items: investimentos.map(i => ({ nome: i.tipo, val: i.valor })) },
          ].map((bloco, idx) => (
            <div key={idx} style={{ background: '#1a1d21', border: '1px solid #ffffff0d', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: bloco.items.length > 0 ? 12 : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{bloco.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: bloco.color }}>{fmtBRL(bloco.val)}</span>
              </div>
              {bloco.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #ffffff08', fontSize: 12, color: '#64748b' }}>
                  <span>{item.nome}{item.data ? ` (${new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')})` : ''}</span>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{fmtBRL(item.val)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}