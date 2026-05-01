import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Treino from "./Treino";
import Onboarding from "./Onboarding";

function App() {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [precisaOnboarding, setPrecisaOnboarding] = useState(false);

  useEffect(() => {
    // Listener primeiro — captura qualquer mudança incluindo login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCarregando(false);
    });

    // Depois verifica sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const { data: perfil } = await supabase
          .from("perfil")
          .select("nome")
          .eq("user_id", session.user.id)
          .single();
        if (!perfil?.nome) setPrecisaOnboarding(true);
      }
      setCarregando(false);
    });

    const refreshInterval = setInterval(
      async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) await supabase.auth.refreshSession();
      },
      10 * 60 * 1000,
    );

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (carregando) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#0f1113",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 52 }}>🧱</div>
        <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>
          DayForge
        </div>
        <div style={{ color: "#64748b", fontSize: 13 }}>
          Forjando seu dia...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={setSession} />;
  }

  if (precisaOnboarding) {
    return (
      <Onboarding
        user={session.user}
        onConcluir={() => setPrecisaOnboarding(false)}
      />
    );
  }

  return <Treino logout={logout} user={session.user} />;
}

export default App;
