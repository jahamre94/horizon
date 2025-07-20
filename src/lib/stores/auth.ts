
import { writable } from 'svelte/store';

export const isGlobalAdmin = writable(false);
export const tenantList = writable<{ id: string; slug: string; name: string; role: string }[]>([]);
export const selectedTenant = writable<{ id: string; name: string; slug: string; role: string } | null>(null);