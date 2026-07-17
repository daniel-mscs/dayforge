import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import RedefinirSenha from "./pages/RedefinirSenha";
import Treino from "./Treino";
import Onboarding from "./Onboarding";
import { ToastContainer } from "./lib/toast";

function App() {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [precisaOnboarding, setPrecisaOnboarding] = useState(false);
  const [abrirPerfil, setAbrirPerfil] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(
    () =>
      window.location.hash.includes("type=recovery") ||
      window.location.pathname.includes("reset-password"),
  );

  useEffect(() => {
    import("./lib/notifications").then(
      ({ agendarNotificacoes, NOTIFICACOES_PADRAO }) => {
        const salvo = localStorage.getItem("df_notif_ativas");
        const notifAtivas = salvo
          ? JSON.parse(salvo)
          : NOTIFICACOES_PADRAO.map((n) => n.id);
        agendarNotificacoes(notifAtivas);
      },
    );
  }, []);

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
          .select("nome, data_nascimento")
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
        <div style={{ position: "relative", width: 120, height: 140 }}>
          <img
            src="/anvil.png"
            alt="bigorna"
            style={{ position: "absolute", bottom: 0, left: 0, width: 120 }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 120,
              height: 140,
              transformOrigin: "56px 30px",
              animation: "hammerSwing 1.2s cubic-bezier(0.4,0,0.2,1) infinite",
            }}
          >
            <svg width="120" height="140" viewBox="0 0 120 140">
              <rect
                x="51"
                y="28"
                width="10"
                height="42"
                rx="3"
                fill="#92400e"
              />
              <rect x="28" y="6" width="64" height="26" rx="4" fill="#e2e8f0" />
              <rect x="28" y="6" width="64" height="10" rx="3" fill="#f8fafc" />
              <rect x="28" y="24" width="64" height="8" rx="2" fill="#cbd5e1" />
            </svg>
          </div>
        </div>
        <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>
          DayForge
        </div>
        <div style={{ color: "#64748b", fontSize: 13 }}>
          Forjando seu dia...
        </div>
      </div>
    );
  }

  if (modoRecuperacao) {
      return (
        <RedefinirSenha
          onConcluido={() => {
            setModoRecuperacao(false);
          }}
        />
      );
    }

    if (!session) {
      return <Login onLoginSuccess={setSession} />;
    }

  if (precisaOnboarding) {
    return (
      <Onboarding
        user={session.user}
        onConcluir={() => {
          setPrecisaOnboarding(false);
          setAbrirPerfil(true);
        }}
      />
    );
  }

  return (
    <>
      <ToastContainer />
      <Treino
        logout={logout}
        user={session.user}
        abrirPerfil={abrirPerfil}
        onAbrirPerfilConcluido={() => setAbrirPerfil(false)}
      />
    </>
  );
}

export default App;
