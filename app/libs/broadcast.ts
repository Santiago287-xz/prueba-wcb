// app/libs/broadcast.ts (versión corregida)
export const clients = new Set<ReadableStreamController<Uint8Array>>();

export function addClient(controller: ReadableStreamController<Uint8Array>) {
  console.log(`Cliente añadido (ID: ${Math.random().toString(36).slice(2)}), total: ${clients.size + 1}`);
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamController<Uint8Array>) {
  clients.delete(controller);
  console.log(`Cliente eliminado, total: ${clients.size}`);
}

export function broadcastEvent(eventData: any) {
  console.log(`Intentando emitir evento a ${clients.size} clientes:`, JSON.stringify(eventData).slice(0, 100) + "...");
  
  if (clients.size === 0) {
    console.log("No hay clientes conectados para recibir el evento");
    return;
  }
  
  const data = `data: ${JSON.stringify(eventData)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  
  let activeClients = 0;
  clients.forEach(client => {
    try {
      client.enqueue(encoded);
      activeClients++;
    } catch (e) {
      console.error('Failed to send SSE:', e);
      clients.delete(client);
    }
  });
  console.log(`Evento enviado exitosamente a ${activeClients} clientes`);
}