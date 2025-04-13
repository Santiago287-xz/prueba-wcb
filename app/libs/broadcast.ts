import { clientsStore } from './globalStore';

export function addClient(controller: ReadableStreamDefaultController<Uint8Array>) {
  (controller as any).clientId = Math.random().toString(36).substring(2, 10);
  clientsStore.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController<Uint8Array>) {
  const id = (controller as any).clientId || 'unknown';
  const deleted = clientsStore.delete(controller);
}

export function broadcastEvent(event: any) {  
  if (clientsStore.size === 0) {
    return;
  }
  
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  clientsStore.forEach(client => {
    try {
      client.enqueue(encodedData);
    } catch (error) {
      console.error(`❌ Error sending to [${(client as any).clientId}]`);
      clientsStore.delete(client);
    }
  });
}