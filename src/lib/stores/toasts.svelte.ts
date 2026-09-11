export type ToastVariant = 'error' | 'info' | 'success';

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
}

let nextId = 1;

class ToastStore {
	items = $state<Toast[]>([]);

	push(message: string, variant: ToastVariant = 'info', durationMs = 5000) {
		const id = nextId++;
		this.items.push({ id, message, variant });
		if (durationMs > 0) {
			setTimeout(() => this.dismiss(id), durationMs);
		}
		return id;
	}

	error(message: string, durationMs = 6000) {
		return this.push(message, 'error', durationMs);
	}

	success(message: string, durationMs = 4000) {
		return this.push(message, 'success', durationMs);
	}

	info(message: string, durationMs = 5000) {
		return this.push(message, 'info', durationMs);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new ToastStore();
