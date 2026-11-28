import { supabase } from "./supabase";

// Sem I/O/0/1 para não confundir na hora de digitar
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function gerarCodigo() {
  let c = "DF-";
  for (let i = 0; i < 5; i++)
    c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return c;
}

// Avisa de forma clara quando o SQL do perfil profissional ainda não foi rodado
export function erroProfissional(error) {
  const msg = error?.message || String(error || "");
  if (
    /tipo_conta|codigo_profissional|vinculos_profissional|meus_vinculos|buscar_profissional|eh_profissional_de/i.test(
      msg,
    )
  )
    return "O perfil profissional ainda não foi ativado no banco. Rode o arquivo supabase/perfil_profissional.sql no Supabase.";
  return msg;
}

// Define o tipo de conta; profissional ganha um código único na primeira vez
export async function definirTipoConta(userId, tipo, codigoAtual) {
  if (tipo === "aluno") {
    const { error } = await supabase
      .from("perfil")
      .update({ tipo_conta: "aluno" })
      .eq("user_id", userId);
    if (error) throw new Error(erroProfissional(error));
    return { tipo_conta: "aluno", codigo_profissional: codigoAtual || null };
  }
  if (codigoAtual) {
    const { error } = await supabase
      .from("perfil")
      .update({ tipo_conta: "profissional" })
      .eq("user_id", userId);
    if (error) throw new Error(erroProfissional(error));
    return { tipo_conta: "profissional", codigo_profissional: codigoAtual };
  }
  // tenta alguns códigos até achar um livre
  for (let i = 0; i < 6; i++) {
    const codigo = gerarCodigo();
    const { error } = await supabase
      .from("perfil")
      .update({ tipo_conta: "profissional", codigo_profissional: codigo })
      .eq("user_id", userId);
    if (!error)
      return { tipo_conta: "profissional", codigo_profissional: codigo };
    if (error.code !== "23505") throw new Error(erroProfissional(error)); // 23505 = código já existe
  }
  throw new Error("Não foi possível gerar um código. Tente de novo.");
}

export async function meusVinculos() {
  const { data, error } = await supabase.rpc("meus_vinculos");
  if (error) throw new Error(erroProfissional(error));
  return data || [];
}

// Aluno: pede para se conectar usando o código do profissional
export async function conectarComCodigo(userId, codigo) {
  const { data, error } = await supabase.rpc("buscar_profissional", { codigo });
  if (error) throw new Error(erroProfissional(error));
  const prof = data?.[0];
  if (!prof)
    throw new Error("Código não encontrado. Confira com seu profissional.");
  if (prof.id === userId) throw new Error("Esse é o seu próprio código.");
  const { error: e2 } = await supabase
    .from("vinculos_profissional")
    .insert([{ profissional_id: prof.id, aluno_id: userId }]);
  if (e2?.code === "23505")
    throw new Error("Você já pediu para se conectar com esse profissional.");
  if (e2) throw new Error(erroProfissional(e2));
  return prof;
}

export async function aceitarVinculo(id) {
  const { error } = await supabase
    .from("vinculos_profissional")
    .update({ status: "ativo" })
    .eq("id", id);
  if (error) throw new Error(erroProfissional(error));
}

export async function removerVinculo(id) {
  const { error } = await supabase
    .from("vinculos_profissional")
    .delete()
    .eq("id", id);
  if (error) throw new Error(erroProfissional(error));
}
