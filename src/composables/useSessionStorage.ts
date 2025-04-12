import { ref, watch } from 'vue'

export function useSessionStorage<T>(key: string, defaultValue: T) {
  // Try to get the value from sessionStorage
  const getStoredValue = (): T => {
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error)
      return defaultValue
    }
  }

  const value = ref<T>(getStoredValue())

  // Watch for changes and update sessionStorage
  watch(
    value,
    (newValue) => {
      try {
        if (newValue === null || newValue === undefined) {
          sessionStorage.removeItem(key)
        } else {
          sessionStorage.setItem(key, JSON.stringify(newValue))
        }
      } catch (error) {
        console.error(`Error writing to sessionStorage key "${key}":`, error)
      }
    },
    { deep: true }
  )

  // Function to remove the item from sessionStorage
  const remove = () => {
    try {
      sessionStorage.removeItem(key)
      value.value = defaultValue
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error)
    }
  }

  return {
    value,
    remove
  }
}