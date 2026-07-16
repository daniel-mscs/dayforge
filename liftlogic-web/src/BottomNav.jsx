import React from "react";

const CATEGORIAS = [
  {
    label: "💪 Treino & Movimento",
    items: [
      { id: "habitos", icon: "✅", label: "Hábitos" },
      { id: "passos", icon: "👟", label: "Passos" },
      { id: "cardio", icon: "🏃", label: "Cardio" },
      { id: "roundtimer", icon: "🥊", label: "Round Timer" },
      { id: "rotina", icon: "📋", label: "Rotina" },
    ],
  },
  {
    label: "🥗 Nutrição",
    items: [
      { id: "dieta", icon: "🥗", label: "Dieta" },
      { id: "macros", icon: "🍽️", label: "Macros" },
      { id: "suplementos", icon: "💊", label: "Suplementos" },
    ],
  },
  {
    label: "❤️ Saúde",
    items: [
      { id: "agua", icon: "💧", label: "Água" },
      { id: "peso", icon: "⚖️", label: "Peso" },
      { id: "sono", icon: "😴", label: "Sono" },
    ],
  },
  {
    label: "🎮 Outros",
    items: [
      { id: "coach", icon: "🤖", label: "Coach" },
      { id: "smartpocket", icon: "💰", label: "SmartPocket" },
      { id: "rpg", icon: "⚔️", label: "RPG" },
    ],
  },
];

const MAIS_IDS = CATEGORIAS.flatMap((c) => c.items.map((i) => i.id));

export default function BottomNav({
  abaPrincipal,
  setAbaPrincipal,
  showMore,
  setShowMore,
  logout,
}) {
  const navegar = (id) => {
    setAbaPrincipal(id);
    setShowMore(false);
  };

  return (
    <>
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-btn ${abaPrincipal === "home" ? "active" : ""}`}
          onClick={() => navegar("home")}
        >
          <span>🏠</span>
          <span>Home</span>
        </button>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "treino" ? "active" : ""}`}
          onClick={() => navegar("treino")}
        >
          <span>🏋️</span>
          <span>Treino</span>
        </button>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "stats" ? "active" : ""}`}
          onClick={() => navegar("stats")}
        >
          <span>📊</span>
          <span>Stats</span>
        </button>

        <div className="bottom-nav-more-wrap">
          <button
            className={`bottom-nav-btn ${MAIS_IDS.includes(abaPrincipal) ? "active" : ""}`}
            onClick={() => setShowMore((p) => !p)}
          >
            <span>🗃️</span>
            <span>Mais</span>
          </button>

          {showMore && (
            <div className="bottom-nav-more-menu">
              {CATEGORIAS.map((cat) => (
                <div key={cat.label}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#475569",
                      letterSpacing: "0.06em",
                      padding: "8px 12px 4px",
                    }}
                  >
                    {cat.label}
                  </div>
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      className={`more-menu-item ${abaPrincipal === item.id ? "active" : ""}`}
                      onClick={() => navegar(item.id)}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid #ffffff0d",
                  marginTop: 6,
                  paddingTop: 4,
                }}
              >
                <button
                  className="more-menu-item more-menu-logout"
                  onClick={logout}
                >
                  <span>🚪</span>
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "perfil" ? "active" : ""}`}
          onClick={() => navegar("perfil")}
        >
          <span>👤</span>
          <span>Perfil</span>
        </button>
      </nav>

      {showMore && (
        <div
          className="bottom-nav-overlay"
          onClick={() => setShowMore(false)}
        />
      )}
    </>
  );
}
