import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Treino from './Treino'

function App() {
  const [session, setSession] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setCarregando(false)
    })

    // Renova o token a cada 10 minutos
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.refreshSession()
      }
    }, 10 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1113', gap: 16 }}>
              <div style={{ fontSize: 52 }}>🧱</div>
              <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>DayForge</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Forjando seu dia...</div>
            </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={setSession} />
  }

  return <Treino logout={logout} user={session.user} />
}

export default App