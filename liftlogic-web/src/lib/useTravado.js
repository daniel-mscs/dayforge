import { useState, useRef, useCallback, useLayoutEffect } from "react";

// Evita clique duplo em ações que salvam no Supabase.
// Enquanto a ação está rodando, novos cliques são ignorados e `ocupado` fica
// true (use para desabilitar o botão e mostrar "Salvando...").
//
//   const [adicionar, adicionando] = useTravado(async () => { ... });
//   <button onClick={adicionar} disabled={adicionando}>
export function useTravado(fn) {
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });
  const trava = useRef(false);
  const [ocupado, setOcupado] = useState(false);

  const executar = useCallback(async (...args) => {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    try {
      return await fnRef.current(...args);
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }, []);

  return [executar, ocupado];
}
