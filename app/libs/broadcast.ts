export const clients = new Set<ReadableStreamController<Uint8Array>>();

export function addClient(controller: ReadableStreamController<Uint8Array>) {
  console.log("Cliente añadido, total:", clients.size + 1);
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamController<Uint8Array>) {
  clients.delete(controller);
  console.log("Cliente eliminado, total:", clients.size);
}

export function broadcastEvent(eventData: any) {
  console.log("Emitiendo evento a", clients.size, "clientes:", JSON.stringify(eventData));
  
  if (clients.size === 0) {
    console.log("No hay clientes conectados para recibir el evento");
    return;
  }
  
  const data = `data: ${JSON.stringify(eventData)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  
  clients.forEach(client => {
    try {
      client.enqueue(encoded);
    } catch (e) {
      console.error('Failed to send SSE:', e);
      clients.delete(client);
    }
  });
}