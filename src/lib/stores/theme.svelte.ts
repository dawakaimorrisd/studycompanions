import { browser } from '$app/environment';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sc_theme';

function systemPrefersDark(): boolean {
	return browser && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadInitial(): ThemePreference {
	if (!browser) return 'system';
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/**
 * Students study late at night, so dark mode is a real feature here, not
 * decoration - light by default, manual override persisted, and it
 * otherwise follows the OS setting. The inline script in app.html applies
 * the class before first paint so there's no flash of the wrong theme;
 * this store keeps it in sync afterwards and lets the user override it.
 */
class ThemeStore {
	preference = $state<ThemePreference>(loadInitial());

	get resolved(): 'light' | 'dark' {
		return this.preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : this.preference;
	}

	set(preference: ThemePreference) {
		this.preference = preference;
		if (browser) localStorage.setItem(STORAGE_KEY, preference);
		this.apply();
	}

	apply() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', this.resolved === 'dark');
	}

	watchSystem() {
		if (!browser) return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (this.preference === 'system') this.apply();
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}
}

export const theme = new ThemeStore();
