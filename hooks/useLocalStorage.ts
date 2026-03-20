import { useState, useEffect, useCallback } from 'react';

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

	const setValue = (value: T | ((val: T) => T)) => {
		try {
			const valueToStore = value instanceof Function ? value(storedValue) : value;
			setStoredValue(valueToStore);
			if (typeof window !== 'undefined') {
				localStorage.setItem(key, JSON.stringify(valueToStore));
				window.dispatchEvent(new Event('local-storage'));
			}
		} catch (error) {
			console.error(`useLocalStorage: Error setting key "${key}"`, error);
		}
	};

	useEffect(() => {
		const handleStorageChange = () => {
			setStoredValue(readValue());
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('local-storage', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('local-storage', handleStorageChange);
		};
	}, [key, readValue]);

	return [storedValue, setValue] as const;
}
