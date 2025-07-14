
import { writable } from 'svelte/store';

export const isGlobalAdmin = writable(false);
export const tenantList = writable<{ id: string; slug: string; name: string; role: string }[]>([]);
