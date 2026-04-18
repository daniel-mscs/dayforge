import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLoginSuccess }) {
  const [modo, setModo] = useState('login')
  const [form, setForm] = useState({ email: '', senha: '', confirmarSenha: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const validarSenha = (senha) => {
    if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
    if (!/[0-9]/.test(senha)) return 'A senha deve ter pelo menos um número.'
    if (!/[a-zA-Z]/.test(senha)) return 'A senha deve ter pelo menos uma letra.'
    return null
  }

  const forcaSenha = (senha) => {
    if (!senha) return null
    let pontos = 0
    if (senha.length >= 8) pontos++
    if (senha.length >= 12) pontos++
    if (/[0-9]/.test(senha)) pontos++
    if (/[a-zA-Z]/.test(senha)) pontos++
    if (/[^a-zA-Z0-9]/.test(senha)) pontos++
    if (pontos <= 2) return { label: 'Fraca', color: '#ef4444', width: '33%' }
    if (pontos <= 3) return { label: 'Média', color: '#f59e0b', width: '66%' }
    return { label: 'Forte', color: '#10b981', width: '100%' }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.senha
    })
    if (error) setErro('Email ou senha incorretos.')
    else onLoginSuccess(data.session)
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const erroSenha = validarSenha(form.senha)
    if (erroSenha) { setErro(erroSenha); return }
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não coincidem.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha
    })
    if (error) setErro(error.message)
    else setSucesso('Conta criada! Verifique seu email para confirmar. 📧')
    setLoading(false)
  }

  const forca = modo === 'register' ? forcaSenha(form.senha) : null

  return (
    <div className="login-bg">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo">🧱</div>
          <div className="login-logo-ring" />
        </div>

        <h1 className="login-title">DayForge</h1>
        <p className="login-subtitle">
          {modo === 'login' ? 'Forje seu dia. Um tijolo por vez.' : 'Crie sua conta e comece a construir.'}
        </p>

        <form onSubmit={modo === 'login' ? handleLogin : handleRegister} className="login-form">
          <div className="login-field">
            <label>EMAIL</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label>SENHA</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                name="senha"
                placeholder={modo === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                value={form.senha}
                onChange={handleChange}
                required
                autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}
              >
                {mostrarSenha ? 'ocultar' : 'ver'}
              </button>
            </div>
            {forca && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: '#ffffff0d', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: 4, width: forca.width, background: forca.color, borderRadius: 99, transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, color: forca.color, marginTop: 3, display: 'block' }}>Senha {forca.label}</span>
              </div>
            )}
          </div>

          {modo === 'register' && (
            <div className="login-field">
              <label>CONFIRMAR SENHA</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  type={mostrarConfirmar ? 'text' : 'password'}
                  name="confirmarSenha"
                  placeholder="Repita sua senha"
                  value={form.confirmarSenha}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}
                >
                  {mostrarConfirmar ? 'ocultar' : 'ver'}
                </button>
              </div>
              {form.confirmarSenha && (
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', color: form.senha === form.confirmarSenha ? '#10b981' : '#ef4444' }}>
                  {form.senha === form.confirmarSenha ? '✅ Senhas coincidem' : '❌ Senhas não coincidem'}
                </span>
              )}
            </div>
          )}

          {erro && <div className="login-erro">⚠️ {erro}</div>}
          {sucesso && <div className="login-sucesso">✅ {sucesso}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                Aguarde...
              </span>
            ) : modo === 'login' ? '▶ Entrar' : '🧱 Criar Conta'}
          </button>
        </form>

        <div className="login-divider"><span>ou</span></div>

        <button className="login-switch" onClick={() => {
          setModo(modo === 'login' ? 'register' : 'login')
          setErro(''); setSucesso('')
          setForm({ email: '', senha: '', confirmarSenha: '' })
        }}>
          {modo === 'login' ? 'Não tem conta? Criar conta →' : '← Já tenho conta'}
        </button>

        <p className="login-footer">Construa hábitos. Forje resultados. 🔥</p>
      </div>
    </div>
  )
}