import { supabase } from "./supabase";

// ══════════════════════════════════════
// Busca de usuários (por nome, pra adicionar aliados)
// ══════════════════════════════════════
export async function buscarUsuarios(query, meuId) {
  if (!query || query.trim().length < 2) return [];
  const { data } = await supabase
    .from("perfil")
    .select("user_id, nome")
    .ilike("nome", `%${query.trim()}%`)
    .neq("user_id", meuId)
    .limit(15);
  return data || [];
}

// ══════════════════════════════════════
// Amizades (modelo "Facebook": pedido -> aceito, sem seguir unilateral)
// ══════════════════════════════════════
export async function enviarPedidoAmizade(meuId, alvoId) {
  // Se o alvo já me enviou um pedido, aceita direto em vez de duplicar
  const { data: existente } = await supabase
    .from("rpg_amizades")
    .select("*")
    .eq("solicitante_id", alvoId)
    .eq("destinatario_id", meuId)
    .maybeSingle();

  if (existente) {
    if (existente.status === "pendente") {
      await supabase
        .from("rpg_amizades")
        .update({ status: "aceito" })
        .eq("id", existente.id);
    }
    return;
  }

  await supabase
    .from("rpg_amizades")
    .insert([
      { solicitante_id: meuId, destinatario_id: alvoId, status: "pendente" },
    ]);
}

export async function aceitarPedido(amizadeId) {
  await supabase
    .from("rpg_amizades")
    .update({ status: "aceito" })
    .eq("id", amizadeId);
}

export async function recusarOuRemoverAmizade(amizadeId) {
  await supabase.from("rpg_amizades").delete().eq("id", amizadeId);
}

// ══════════════════════════════════════
// Conquistas (feed) — geradas automaticamente pelo sistema
// ══════════════════════════════════════
export async function gerarConquista(userId, tipo, descricao, xp = 0) {
  await supabase
    .from("rpg_conquistas")
    .insert([{ user_id: userId, tipo, descricao, xp }]);
}

// ══════════════════════════════════════
// Impactos (curtir uma conquista)
// ══════════════════════════════════════
export async function curtirConquista(conquistaId, userId) {
  await supabase
    .from("rpg_impactos")
    .insert([{ conquista_id: conquistaId, user_id: userId }]);
}

export async function descurtirConquista(conquistaId, userId) {
  await supabase
    .from("rpg_impactos")
    .delete()
    .eq("conquista_id", conquistaId)
    .eq("user_id", userId);
}
