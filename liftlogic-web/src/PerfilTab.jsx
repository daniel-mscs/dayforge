import React from "react";
import { toast } from "./lib/toast";
import React from "react";
import { toast } from "./lib/toast";
import NotificacoesTab from "./NotificacoesTab";

export default function PerfilTab({
  perfil,
  setPerfil,
  perfilEditado,
  setPerfilEditado,
  perfilOriginal,
  salvandoPerfil,
  perfilMsg,
  salvarPerfil,
  perfilCompleto,
  subAbaPerfil,
  setSubAbaPerfil,
  notifAtivas,
  setNotifAtivas,
  notifPermissao,
  setNotifPermissao,
  ajudaAncora,
  setAjudaAncora,
  imc,
  tmb,
  classificarIMC,
  logout,
}) {
  return (
    <div className="perfil-section">
      {/* Sub-nav perfil */}
      <div className="treino-subnav" style={{ marginBottom: 20 }}>
        <button
          className={
            subAbaPerfil === "perfil"
              ? "treino-subnav-btn active"
              : "treino-subnav-btn"
          }
          onClick={() => setSubAbaPerfil("perfil")}
        >
          👤 Perfil
        </button>
        <button
          className={
            subAbaPerfil === "ajuda"
              ? "treino-subnav-btn active"
              : "treino-subnav-btn"
          }
          onClick={() => setSubAbaPerfil("ajuda")}
        >
          ❓ Ajuda
        </button>
        <button
          className={
            subAbaPerfil === "notificacoes"
              ? "treino-subnav-btn active"
              : "treino-subnav-btn"
          }
          onClick={() => setSubAbaPerfil("notificacoes")}
        >
          🔔 Alertas
        </button>
      </div>

      {/* ── PERFIL ── */}
      {subAbaPerfil === "perfil" && (
        <>
          {!perfilCompleto && (
            <div
              style={{
                background: "#6366f115",
                border: "1px solid #6366f144",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 13,
                color: "#818cf8",
              }}
            >
              👋 Bem-vindo ao DayForge! Complete seu perfil para começar.
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h1 className="title-divisao" style={{ margin: 0 }}>
              Meu Perfil 👤
            </h1>
            {!perfilEditado && perfilOriginal && (
              <button
                className="peso-btn-alterar"
                onClick={() => setPerfilEditado(true)}
              >
                Alterar
              </button>
            )}
          </div>

          <form className="form-cadastro" onSubmit={salvarPerfil}>
            <input
              type="text"
              placeholder="Seu nome"
              value={perfil.nome}
              onChange={(e) => {
                setPerfil({ ...perfil, nome: e.target.value });
                setPerfilEditado(true);
              }}
              disabled={!perfilEditado}
              style={{ opacity: perfilEditado ? 1 : 0.6 }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <input
                type="number"
                placeholder="Peso (kg)"
                value={perfil.peso}
                onChange={(e) => {
                  setPerfil({ ...perfil, peso: e.target.value });
                  setPerfilEditado(true);
                }}
                disabled={!perfilEditado}
                style={{
                  opacity: perfilEditado ? 1 : 0.6,
                  textAlign: "center",
                }}
              />
              <input
                type="number"
                placeholder="Altura (cm)"
                value={perfil.altura}
                onChange={(e) => {
                  setPerfil({ ...perfil, altura: e.target.value });
                  setPerfilEditado(true);
                }}
                disabled={!perfilEditado}
                style={{
                  opacity: perfilEditado ? 1 : 0.6,
                  textAlign: "center",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                DATA DE NASCIMENTO
              </label>
              <input
                type="date"
                value={perfil.data_nascimento || ""}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setPerfil({ ...perfil, data_nascimento: e.target.value });
                  setPerfilEditado(true);
                }}
                disabled={!perfilEditado}
                style={{
                  opacity: perfilEditado ? 1 : 0.6,
                  colorScheme: "dark",
                  width: "100%",
                }}
              />
            </div>

            {perfilEditado ? (
              <>
                <div className="sexo-selector">
                  <button
                    type="button"
                    className={
                      perfil.sexo === "M" ? "sexo-btn active" : "sexo-btn"
                    }
                    onClick={() => setPerfil({ ...perfil, sexo: "M" })}
                  >
                    ♂ Masculino
                  </button>
                  <button
                    type="button"
                    className={
                      perfil.sexo === "F" ? "sexo-btn active" : "sexo-btn"
                    }
                    onClick={() => setPerfil({ ...perfil, sexo: "F" })}
                  >
                    ♀ Feminino
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginBottom: 4,
                    marginTop: 8,
                  }}
                >
                  OBJETIVO
                </div>
                <div className="sexo-selector">
                  <button
                    type="button"
                    className={
                      perfil.objetivo === "emagrecer"
                        ? "sexo-btn active"
                        : "sexo-btn"
                    }
                    onClick={() =>
                      setPerfil({ ...perfil, objetivo: "emagrecer" })
                    }
                  >
                    🔥 Emagrecer
                  </button>
                  <button
                    type="button"
                    className={
                      perfil.objetivo === "manter"
                        ? "sexo-btn active"
                        : "sexo-btn"
                    }
                    onClick={() => setPerfil({ ...perfil, objetivo: "manter" })}
                  >
                    ⚖️ Manter
                  </button>
                  <button
                    type="button"
                    className={
                      perfil.objetivo === "ganhar"
                        ? "sexo-btn active"
                        : "sexo-btn"
                    }
                    onClick={() => setPerfil({ ...perfil, objetivo: "ganhar" })}
                  >
                    💪 Ganhar
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  padding: "4px 0",
                  display: "flex",
                  gap: 12,
                }}
              >
                <span>
                  {perfil.sexo === "M" ? "♂ Masculino" : "♀ Feminino"}
                </span>
                <span>
                  {perfil.objetivo === "emagrecer"
                    ? "🔥 Emagrecer"
                    : perfil.objetivo === "ganhar"
                      ? "💪 Ganhar massa"
                      : "⚖️ Manter"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                SOBRE MIM{" "}
                <span style={{ color: "#334155", fontWeight: 400 }}>
                  (contexto para o Coach)
                </span>
              </label>
              <textarea
                placeholder="Ex: Trabalho à noite, tenho 2 filhos, treino 3x por semana, objetivo é hipertrofia..."
                value={perfil.sobre_mim || ""}
                onChange={(e) => {
                  setPerfil({ ...perfil, sobre_mim: e.target.value });
                  setPerfilEditado(true);
                }}
                disabled={!perfilEditado}
                rows={4}
                style={{
                  width: "100%",
                  background: "#0f172a",
                  border: "1px solid #ffffff0d",
                  borderRadius: 10,
                  color: "#f8fafc",
                  fontSize: 13,
                  padding: "10px 12px",
                  resize: "none",
                  opacity: perfilEditado ? 1 : 0.6,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {perfilEditado && (
              <button type="submit" disabled={salvandoPerfil}>
                {salvandoPerfil ? "Salvando..." : "Salvar Perfil"}
              </button>
            )}
            {perfilMsg && (
              <p
                className={
                  perfilMsg.includes("Erro") ? "auth-erro" : "auth-sucesso"
                }
              >
                {perfilMsg}
              </p>
            )}
          </form>

          {(imc || tmb) && (
            <div className="stats-grid">
              {imc && (
                <div className="stat-card">
                  <span>IMC</span>
                  <strong style={{ color: classificarIMC(imc).color }}>
                    {imc}
                  </strong>
                  <small>{classificarIMC(imc).label}</small>
                </div>
              )}
              {tmb && (
                <div className="stat-card">
                  <span>TMB</span>
                  <strong>{tmb}</strong>
                  <small>kcal/dia em repouso</small>
                </div>
              )}
              {perfil.peso && perfil.altura && (
                <div className="stat-card">
                  <span>PESO</span>
                  <strong>{perfil.peso} kg</strong>
                  <small>{perfil.altura} cm</small>
                </div>
              )}
              {perfil.idade && (
                <div className="stat-card">
                  <span>IDADE</span>
                  <strong>{perfil.idade}</strong>
                  <small>anos</small>
                </div>
              )}
            </div>
          )}

          <button
            className="nav-btn-logout"
            style={{
              marginTop: 24,
              width: "100%",
              padding: 14,
              borderRadius: 10,
              border: "1px solid #ef444433",
              background: "#3a1a1a",
              color: "#ef4444",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={logout}
          >
            🚪 Sair da conta
          </button>
        </>
      )}

      {/* ── NOTIFICAÇÕES ── */}
      {subAbaPerfil === "notificacoes" && (
        <NotificacoesTab
          notifAtivas={notifAtivas}
          setNotifAtivas={setNotifAtivas}
          notifPermissao={notifPermissao}
          setNotifPermissao={setNotifPermissao}
        />
      )}

      {/* ── AJUDA ── */}
      {subAbaPerfil === "ajuda" && (
        <div
          className="ajuda-section"
          ref={(el) => {
            if (el && ajudaAncora) {
              setTimeout(() => {
                const target = document.getElementById(ajudaAncora);
                if (target)
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                setAjudaAncora(null);
              }, 100);
            }
          }}
        >
          <h1 className="title-divisao">❓ Ajuda & Saúde</h1>

          <div id="ajuda-geral" className="ajuda-group-title">
            📱 Como usar o app
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">1</div>
            <div className="ajuda-body">
              <strong>Home</strong>
              <p>
                Visão geral do dia — tarefas, água, peso, refeição atual,
                suplementos e hábitos.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">2</div>
            <div className="ajuda-body">
              <strong>Treino</strong>
              <p>
                Exercícios com timer, descanso cronometrado, stats de
                kcal/volume/tempo e histórico completo.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">3</div>
            <div className="ajuda-body">
              <strong>Rotina</strong>
              <p>
                Gere blocos de dias com tarefas por período (Acordar, Manhã,
                Tarde, Noite). Enter cria a próxima tarefa. ⧉ clona o dia.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">4</div>
            <div className="ajuda-body">
              <strong>Mais</strong>
              <p>
                Acessa Água, Peso, Dieta, Suplementos, Macros, Passos e Stats
                pelo menu 🗃️.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">5</div>
            <div className="ajuda-body">
              <strong>Home personalizável</strong>
              <p>
                Toque em "✏️ Personalizar" na home para reordenar os cards
                arrastando ou ocultar seções que não usa.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Hábitos personalizados</strong>
              <p>
                Na aba Hábitos (menu 🗃️) role até o final e toque em "+
                Adicionar hábito" para criar hábitos com emoji e nome
                personalizados.
              </p>
            </div>
          </div>

          <div id="ajuda-cortisol" className="ajuda-group-title">
            🧠 Cortisol — o hormônio do estresse
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>O que é o cortisol?</strong>
              <p>
                Hormônio produzido em resposta ao estresse. Cronicamente elevado
                causa retenção de líquido (até 2kg a mais na balança), dificulta
                queima de gordura, prejudica o sono e reduz testosterona.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Como reduzir?</strong>
              <p>
                Dormir 7–8h, treinos moderados (máx. 1h/sessão), alimentação
                equilibrada, hidratação adequada e gerenciar estresse emocional.
              </p>
            </div>
          </div>

          <div id="ajuda-sono" className="ajuda-group-title">
            😴 Sono — por que 7 a 8 horas importam
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>O que acontece dormindo?</strong>
              <p>
                O GH (hormônio do crescimento) é liberado durante o sono —
                responsável pela recuperação muscular e queima de gordura. Menos
                de 6h aumenta cortisol, grelina (fome) e reduz leptina
                (saciedade).
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Dica prática</strong>
              <p>
                Acorde sempre no mesmo horário, mesmo no fim de semana. Evite
                telas 30 minutos antes de dormir.
              </p>
            </div>
          </div>

          <div id="ajuda-musculacao" className="ajuda-group-title">
            🏋️ Musculação — benefícios além da estética
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Metabolismo acelerado</strong>
              <p>
                Cada kg de músculo queima 13–20 kcal por dia em repouso. Quanto
                mais massa muscular, mais calorias você gasta sem fazer nada.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Saúde mental e hormonal</strong>
              <p>
                Treino de força aumenta testosterona, serotonina e dopamina.
                3–4x por semana já gera benefício comprovado.
              </p>
            </div>
          </div>

          <div id="ajuda-hidratacao" className="ajuda-group-title">
            💧 Hidratação
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>35ml vs 50ml por kg</strong>
              <p>
                35ml/kg é o mínimo para sedentários. Se você treina, use
                50ml/kg. Desidratação de 2% já reduz performance em até 20%.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Água e cortisol</strong>
              <p>
                Cortisol elevado causa retenção hídrica. Beber mais água
                paradoxalmente ajuda a reduzir essa retenção. Comece o dia com
                500ml em jejum.
              </p>
            </div>
          </div>

          <div id="ajuda-dieta" className="ajuda-group-title">
            🥗 Dieta e Macros
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Deficit calórico</strong>
              <p>
                1kg de gordura = ~7.700 kcal. Deficit de 500–800 kcal/dia =
                0,5–0,8kg/semana. Acima de 1.000 kcal de deficit queima músculo
                e derruba o metabolismo.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Saldo calórico</strong>
              <p>
                Na aba Macros você vê o saldo do dia: meta base + kcal do treino
                + kcal dos passos - kcal ingeridas. Verde = deficit
                (emagrecendo). Vermelho = superavit (ganhando peso).
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Sugestão de dieta automática</strong>
              <p>
                Na aba Dieta toque em "✨ Sugestão de dieta automática", escolha
                seu objetivo e renda financeira. O app gera um plano alimentar
                completo que você pode editar depois.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Alimentos personalizados</strong>
              <p>
                Não achou seu alimento no banco TACO? Na aba Macros role até
                "Alimentos Personalizados" e cadastre com nome, kcal, proteína,
                carboidrato e gordura por 100g.
              </p>
            </div>
          </div>

          <div id="ajuda-peso" className="ajuda-group-title">
            ⚖️ Pesagem diária — como interpretar
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Por que pesar todo dia?</strong>
              <p>
                O peso oscila 1–3kg por resíduo gástrico, hidratação e sódio.
                Essas variações não são gordura — são fluidos.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>A média de 7 dias é o que importa</strong>
              <p>
                Se a média da semana 2 for menor que a da semana 1, você
                emagreceu. Um único dia nunca conta a história real.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Como se pesar corretamente</strong>
              <p>
                Sempre em jejum logo após acordar, após urinar, sem roupa ou com
                roupa leve sempre igual. Mesmo horário todo dia.
              </p>
            </div>
          </div>

          <div id="ajuda-medidas" className="ajuda-group-title">
            📏 Medidas corporais
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Por que medir?</strong>
              <p>
                A balança não conta tudo — você pode perder gordura e ganhar
                músculo e o peso ficar igual. As medidas corporais mostram a
                real transformação do seu corpo.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Como medir</strong>
              <p>
                Use uma fita métrica flexível encostada na pele sem apertar nem
                folgar. Meça sempre no mesmo horário, de preferência pela manhã
                em jejum.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Bíceps</strong>
              <p>
                Braço flexionado a 90°, fita na parte mais grossa do músculo.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Peito</strong>
              <p>Na altura dos mamilos, braços relaxados ao lado do corpo.</p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Cintura</strong>
              <p>
                Parte mais estreita do abdômen, geralmente 2 dedos acima do
                umbigo.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Quadril</strong>
              <p>
                Parte mais larga do quadril e glúteo, fita paralela ao chão.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Com que frequência medir?</strong>
              <p>
                1x por semana é suficiente. Mudanças significativas levam
                semanas para aparecer.
              </p>
            </div>
          </div>

          <div id="ajuda-passos" className="ajuda-group-title">
            👟 Passos diários
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Como registrar seus passos</strong>
              <p>
                Usa relógio ou celular que conta passos? Ao final do dia vá na
                aba Passos (menu 🗃️) e registre quantos passos você deu.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Por que 10.000 passos?</strong>
              <p>
                A OMS recomenda 10.000 passos por dia — equivale a
                aproximadamente 8km e 400 kcal. Mas qualquer aumento já traz
                benefícios.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Passos e emagrecimento</strong>
              <p>
                Cada 1.000 passos queima aproximadamente 40 kcal. 10.000 passos
                diários = ~400 kcal extras por dia.
              </p>
            </div>
          </div>

          <div id="ajuda-cardio" className="ajuda-group-title">
            🏃 Cardio
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">1</div>
            <div className="ajuda-body">
              <strong>O que é?</strong>
              <p>
                A aba Cardio registra suas atividades aeróbicas separadas dos
                treinos de musculação. Acesse pelo menu 🗃️ → Cardio.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">2</div>
            <div className="ajuda-body">
              <strong>Registrando uma atividade</strong>
              <p>
                Selecione a atividade no grid (Muay Thai, Corrida, Bike, etc),
                informe a duração em minutos e o app calcula as kcal
                automaticamente usando o MET de cada atividade.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">3</div>
            <div className="ajuda-body">
              <strong>O que é MET?</strong>
              <p>
                MET (Equivalente Metabólico) é uma medida de intensidade da
                atividade. A fórmula é: kcal = MET × peso(kg) × tempo(horas).
                Muay Thai tem MET 10.0, corrida 9.8, caminhada 3.5.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">4</div>
            <div className="ajuda-body">
              <strong>Sobrescrever kcal</strong>
              <p>
                Se seu relógio ou app mediu as kcal com mais precisão, preencha
                o campo "Sobrescrever kcal" e o app usará esse valor em vez do
                calculado.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Histórico do mês</strong>
              <p>
                O app mostra o total de sessões, minutos e kcal do mês atual. O
                gráfico exibe as kcal por sessão ao longo do tempo.
              </p>
            </div>
          </div>

          <div id="ajuda-coach" className="ajuda-group-title">
            🤖 Coach
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">1</div>
            <div className="ajuda-body">
              <strong>O que é o Coach?</strong>
              <p>
                O Coach coleta todos os seus dados do app (treinos, cardio,
                sono, água, passos, macros, humor e peso) e gera um relatório
                personalizado para você analisar com uma IA.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">2</div>
            <div className="ajuda-body">
              <strong>Como usar</strong>
              <p>
                Acesse pelo menu 🗃️ → Coach. Escolha o período (hoje, semana,
                mês ou um dia específico) e clique em "Gerar Relatório".
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">3</div>
            <div className="ajuda-body">
              <strong>Copiando o relatório</strong>
              <p>
                Após gerar, clique em "Copiar" para copiar o prompt completo com
                todos os seus dados.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">4</div>
            <div className="ajuda-body">
              <strong>Escolhendo a IA</strong>
              <p>
                Cole o prompt em qualquer IA gratuita — ChatGPT
                (chat.openai.com), Gemini (gemini.google.com) ou Claude
                (claude.ai). Os atalhos aparecem direto na tela após gerar o
                relatório.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Dica</strong>
              <p>
                Quanto mais dados você registrar no app (sono, humor, macros,
                passos), mais rica e personalizada será a análise da IA.
              </p>
            </div>
          </div>

          <div id="ajuda-smartpocket" className="ajuda-group-title">
            💰 SmartPocket
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">1</div>
            <div className="ajuda-body">
              <strong>O que é?</strong>
              <p>
                O SmartPocket é seu controle financeiro pessoal integrado ao
                DayForge. Registre gastos, cartão, investimentos e entradas por
                mês.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">2</div>
            <div className="ajuda-body">
              <strong>Gastos</strong>
              <p>
                Registre suas contas fixas e variáveis do mês com descrição,
                valor e data de pagamento.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">3</div>
            <div className="ajuda-body">
              <strong>Cartão de Crédito</strong>
              <p>
                Lance suas compras no crédito separadamente para ter controle do
                quanto gastou no cartão.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">4</div>
            <div className="ajuda-body">
              <strong>Investimentos</strong>
              <p>
                Registre seus aportes em Caixinha/CDB, Bolsa de Valores ou
                Reserva de Emergência.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">5</div>
            <div className="ajuda-body">
              <strong>Entradas</strong>
              <p>
                Registre tudo que entrou no mês — salário, freelas, vendas, etc.
              </p>
            </div>
          </div>
          <div className="ajuda-item">
            <div className="ajuda-num">💡</div>
            <div className="ajuda-body">
              <strong>Resumo</strong>
              <p>
                Na aba Resumo você vê o balanço do mês — entradas menos gastos,
                cartão e investimentos. Verde = positivo, vermelho = negativo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
