import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type DashboardType = 'observer' | 'cosmic';

// Dashboard selection store with persistence
function createDashboardStore() {
	const { subscribe, set, update } = writable<DashboardType>('observer');

	return {
		subscribe,
		set: (value: DashboardType) => {
			if (browser) {
				localStorage.setItem('selected_dashboard', value);
			}
			set(value);
		},
		init: () => {
			if (browser) {
				const stored = localStorage.getItem('selected_dashboard');
				if (stored && (stored === 'observer' || stored === 'cosmic')) {
					set(stored as DashboardType);
				}
			}
		}
	};
}

// Auto-refresh interval store with persistence
function createAutoRefreshStore() {
	const { subscribe, set, update } = writable<number>(60); // Default 60 seconds

	return {
		subscribe,
		set: (value: number) => {
			if (browser) {
				localStorage.setItem('auto_refresh_interval', value.toString());
			}
			set(value);
		},
		init: () => {
			if (browser) {
				const stored = localStorage.getItem('auto_refresh_interval');
				if (stored) {
					const interval = parseInt(stored);
					if (!isNaN(interval) && interval > 0) {
						set(interval);
					}
				}
			}
		}
	};
}

// Auto-refresh enabled store with persistence
function createAutoRefreshEnabledStore() {
	const { subscribe, set, update } = writable<boolean>(true);

	return {
		subscribe,
		set: (value: boolean) => {
			if (browser) {
				localStorage.setItem('auto_refresh_enabled', value.toString());
			}
			set(value);
		},
		init: () => {
			if (browser) {
				const stored = localStorage.getItem('auto_refresh_enabled');
				if (stored) {
					set(stored === 'true');
				}
			}
		}
	};
}

export const selectedDashboard = createDashboardStore();
export const autoRefreshInterval = createAutoRefreshStore();
export const autoRefreshEnabled = createAutoRefreshEnabledStore();
