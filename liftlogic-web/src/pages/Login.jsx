import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import '../App.css'

export default function Login({ onLoginSuccess }) {
  const [modo, setModo] = useState('login') // 'login' ou 'register'
  const [form, setForm] = useState({ email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

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
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha
    })
    if (error) setErro(error.message)
    else setSucesso('Conta criada! Verifique seu email para confirmar. 📧')
    setLoading(false)
  }

  return (
    <div className="container auth-container">
      <div className="auth-card">
        <div className="auth-logo">🏋️‍♂️</div>
        <h1 className="auth-title">LiftLogic</h1>
        <p className="auth-subtitle">{modo === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</p>

        <form onSubmit={modo === 'login' ? handleLogin : handleRegister} className="auth-form">
          <div className="auth-field">
            <label>EMAIL</label>
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

          <div className="auth-field">
            <label>SENHA</label>
            <input
              type="password"
              name="senha"
              placeholder={modo === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={form.senha}
              onChange={handleChange}
              required
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {erro && <p className="auth-erro">⚠️ {erro}</p>}
          {sucesso && <p className="auth-sucesso">✅ {sucesso}</p>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <button className="auth-switch" onClick={() => { setModo(modo === 'login' ? 'register' : 'login'); setErro(''); setSucesso('') }}>
          {modo === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}