export function formatDuration(totalSeconds: number): string {
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const totalMinutes = Math.round(totalSeconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}

export function formatShortDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
