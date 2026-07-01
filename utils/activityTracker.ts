// Barramento simples de eventos de atividade, partilhado entre o cliente HTTP (api.ts)
// e o AuthContext, para que qualquer pedido ao servidor conte como atividade do utilizador.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Chamado sempre que há uma interação com o servidor, por mais pequena que seja. */
export function pingActivity(): void {
  listeners.forEach((cb) => cb());
}

/** Subscreve notificações de atividade. Devolve a função de cancelamento da subscrição. */
export function onActivity(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
