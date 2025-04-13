// app/libs/globalStore.ts
declare global {
	var clientsStore:
		| Set<
				ReadableStreamDefaultController<Uint8Array>
		  >
		| undefined;
}

// Use global object for persistence across module reloads
if (!global.clientsStore) {
	global.clientsStore = new Set<
		ReadableStreamDefaultController<Uint8Array>
	>();
}

export const clientsStore =
	global.clientsStore;
