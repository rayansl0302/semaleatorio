/** Evento global para abrir o painel de mensagens (estilo dock) com um peer. */
export const MESSAGE_DOCK_OPEN_EVENT = 'semaleatorio:open-messages-dock'

export function openMessagesDockWithPeer(peerUid: string) {
  window.dispatchEvent(
    new CustomEvent(MESSAGE_DOCK_OPEN_EVENT, { detail: { peerUid } }),
  )
}
