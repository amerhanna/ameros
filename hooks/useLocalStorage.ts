import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
	const readValue = useCallback((): T => {
		if (typeof window === 'undefined') return initialValue;
		try {
			const item = localStorage.getItem(key);
			return item ? (JSON.parse(item) as T) : initialValue;
		} catch (error) {
			console.error(`useLocalStorage: Error reading key "${key}"`, error);
			return initialValue;
		}
	}, [key, initialValue]);

	const [storedValue, setStoredValue] = useState<T>(readValue);
	const isInternalUpdate = useRef(false);

	const setValue = (value: T | ((val: T) => T)) => {
		try {
			isInternalUpdate.current = true;
			setStoredValue((prevValue) => {
				const valueToStore = value instanceof Function ? value(prevValue) : value;
				if (typeof window !== 'undefined') {
					localStorage.setItem(key, JSON.stringify(valueToStore));
					window.dispatchEvent(new CustomEvent('local-storage', { detail: { key } }));
				}
				return valueToStore;
			});
			// Reset after the update cycle
			setTimeout(() => {
				isInternalUpdate.current = false;
			}, 0);
		} catch (error) {
			console.error(`useLocalStorage: Error setting key "${key}"`, error);
		}
	};

const handleStorageChange = useCallback((event: StorageEvent | Event) => {
		if (isInternalUpdate.current) return;
		if (event instanceof StorageEvent) {
			if (event.key && event.key !== key) return;
		} else {
			const customEvent = event as CustomEvent<{ key?: string }>;
			const changedKey = customEvent.detail?.key;
			if (changedKey && changedKey !== key) return;
		}
		// Defer the update to avoid setState during render
		setTimeout(() => setStoredValue(readValue()), 0);
	}, [key, readValue]);

	useEffect(() => {
		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('local-storage', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('local-storage', handleStorageChange);
		};
	}, [handleStorageChange]);

	return [storedValue, setValue] as const;
}
