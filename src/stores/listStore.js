import { ref } from 'vue';
import { defineStore } from 'pinia';
import api from '@/api';

export const useListStore = defineStore('lists', () => {
  const lists = ref([]);
  const isLoading = ref(false);
  let lastFetchTimestamp = 0;
  const FETCH_COOLDOWN = 2000;

  async function fetchLists(force = false) {
    const now = Date.now();
    if (!force && now - lastFetchTimestamp < FETCH_COOLDOWN) {
      return lists.value;
    }

    try {
      isLoading.value = true;
      const response = await api.get("/api/lists");
      // Initialize each list with default properties
      const initializedLists = (Array.isArray(response.data) ? response.data : [])
        .map(list => ({
          ...list,
          apps: [],
          size: '0 GB',
          isExpanded: false,
          isEditing: false
        }));
      lists.value = initializedLists;
      lastFetchTimestamp = now;
      return lists.value;
    } catch (error) {
      console.error('Failed to fetch lists:', error);
      lists.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  function getList(id) {
    return lists.value.find(list => list.id === id);
  }

  function updateList(id, updates) {
    const index = lists.value.findIndex(list => list.id === id);
    if (index !== -1) {
      lists.value[index] = { ...lists.value[index], ...updates };
    }
  }

  return {
    lists,
    isLoading,
    fetchLists,
    getList,
    updateList
  };
});
