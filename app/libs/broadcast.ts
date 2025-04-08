// app/lib/broadcast.ts
import { broadcastEvent as ssebroadcast } from "@/app/api/rfid-events/route";

export function broadcastEvent(eventData: any): boolean {
  try {
    // Llama directamente a la función SSE en lugar de usar fetch
    ssebroadcast(eventData);
    return true;
  } catch (error) {
    console.error("Error broadcasting event:", error);
    return false;
  }
}