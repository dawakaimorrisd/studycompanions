import { browser } from '$app/environment';

class NetworkStore {
	online = $state(browser ? navigator.onLine : true);

	constructor() {
		if (browser) {
			window.addEventListener('online', () => (this.online = true));
			window.addEventListener('offline', () => (this.online = false));
		}
	}
}

export const network = new NetworkStore();
