import React from "react";
import {
  Home as HomeIcon,
  Dumbbell,
  Target,
  LayoutGrid,
  User,
  LogOut,
  CheckCircle2,
  Footprints,
  Activity,
  Timer,
  ClipboardList,
  Salad,
  UtensilsCrossed,
  Pill,
  Droplet,
  Scale,
  Moon,
  Sparkles,
  Bot,
  Wallet,
  Swords,
} from "lucide-react";

const CATEGORIAS = [
  {
    label: "Treino & Movimento",
    items: [
      { id: "habitos", icon: CheckCircle2, label: "Hábitos" },
      { id: "passos", icon: Footprints, label: "Passos" },
      { id: "cardio", icon: Activity, label: "Cardio" },
      { id: "roundtimer", icon: Timer, label: "Round Timer" },
      { id: "rotina", icon: ClipboardList, label: "Rotina" },
    ],
  },
  {
    label: "Nutrição",
    items: [
      { id: "dieta", icon: Salad, label: "Dieta" },
      { id: "macros", icon: UtensilsCrossed, label: "Macros" },
      { id: "suplementos", icon: Pill, label: "Suplementos" },
    ],
  },
  {
    label: "Saúde",
    items: [
      { id: "agua", icon: Droplet, label: "Água" },
      { id: "peso", icon: Scale, label: "Peso" },
      { id: "sono", icon: Moon, label: "Sono" },
      { id: "insights", icon: Sparkles, label: "Insights" },
    ],
  },
  {
    label: "Outros",
    items: [
      { id: "coach", icon: Bot, label: "Coach" },
      { id: "smartpocket", icon: Wallet, label: "Finanças" },
      { id: "rpg", icon: Swords, label: "RPG" },
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
          style={
            abaPrincipal === "home"
              ? {
                  color: "#3b82f6",
                  filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))",
                }
              : undefined
          }
        >
          <HomeIcon size={20} strokeWidth={2} />
          <span>Home</span>
        </button>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "treino" ? "active" : ""}`}
          onClick={() => navegar("treino")}
          style={
            abaPrincipal === "treino"
              ? {
                  color: "#6366f1",
                  filter: "drop-shadow(0 0 6px rgba(99,102,241,0.5))",
                }
              : undefined
          }
        >
          <Dumbbell size={20} strokeWidth={2} />
          <span>Treino</span>
        </button>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "stats" ? "active" : ""}`}
          onClick={() => navegar("stats")}
          style={
            abaPrincipal === "stats"
              ? {
                  color: "#10b981",
                  filter: "drop-shadow(0 0 6px rgba(16,185,129,0.5))",
                }
              : undefined
          }
        >
          <Target size={20} strokeWidth={2} />
          <span>Metas</span>
        </button>

        <div className="bottom-nav-more-wrap">
          <button
            className={`bottom-nav-btn ${MAIS_IDS.includes(abaPrincipal) ? "active" : ""}`}
            onClick={() => setShowMore((p) => !p)}
            style={
              MAIS_IDS.includes(abaPrincipal)
                ? {
                    color: "#f59e0b",
                    filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))",
                  }
                : undefined
            }
          >
            <LayoutGrid size={20} strokeWidth={2} />
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
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className={`more-menu-item ${abaPrincipal === item.id ? "active" : ""}`}
                        onClick={() => navegar(item.id)}
                      >
                        <Icon size={17} strokeWidth={2} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
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
                  <LogOut size={17} strokeWidth={2} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className={`bottom-nav-btn ${abaPrincipal === "perfil" ? "active" : ""}`}
          onClick={() => navegar("perfil")}
          style={
            abaPrincipal === "perfil"
              ? {
                  color: "#ec4899",
                  filter: "drop-shadow(0 0 6px rgba(236,72,153,0.5))",
                }
              : undefined
          }
        >
          <User size={20} strokeWidth={2} />
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
