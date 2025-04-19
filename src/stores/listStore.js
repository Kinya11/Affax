import { ref } from 'vue';
import { defineStore } from 'pinia';
import api from '@/api';

export const useListStore = defineStore('list', {
  state: () => ({
    lists: [],
    isLoading: false
  }),
  actions: {
    async fetchLists() {
      this.isLoading = true;
      try {
        const { data } = await api.get('/api/lists');
        // Preserve existing apps data when updating lists
        const existingLists = this.lists;
        this.lists = data.map(newList => {
          const existingList = existingLists.find(list => list.id === newList.id);
          return {
            ...newList,
            isExpanded: existingList?.isExpanded || false,
            isEditing: existingList?.isEditing || false,
            apps: existingList?.apps || [],
            size: existingList?.size || '0 GB'
          };
        });
      } catch (error) {
        console.error('Error fetching lists:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    updateList(listId, updates) {
      const index = this.lists.findIndex(list => list.id === listId);
      if (index !== -1) {
        this.lists[index] = { 
          ...this.lists[index], 
          ...updates,
          apps: updates.apps || this.lists[index].apps // Preserve apps if not included in updates
        };
      }
    }
  }
});
