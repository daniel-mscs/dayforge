import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Treino from './Treino'

function App() {
  const [session, setSession] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Pega sessão atual ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCarregando(false)
    })

    // Escuta mudanças de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1113', color: '#64748b', fontSize: '14px' }}>
        Carregando...
      </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={setSession} />
  }

  return <Treino logout={logout} user={session.user} />
}

export default App