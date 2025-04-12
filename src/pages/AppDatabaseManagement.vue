<script setup>
import { ref, onMounted } from 'vue';
import Navbar from '@/comps/Navbar/Navbar.vue';
import MainContainer from '@/comps/MainContainer.vue';
import ConfirmationModal from '@/comps/ConfirmationModal.vue';
import NotificationPopup from '@/comps/NotificationPopup.vue';

const serverPort = import.meta.env.VITE_API_PORT; // Access the environment variable
const serverAPI = `https://affax.app:${serverPort}`;

let theme = ref('light'); // Default theme set to light

function toggleTheme(newTheme) {
  theme.value = newTheme;
}

const newCategoryName = ref(""); // Define newCategoryName
const newCategoryId = ref(""); // Define newCategoryId
const categories = ref([]);  // Store fetched categories
const selectedCategory = ref(null); // For deletion
const newApp = ref({
  name: '',
  description: '',
  category: '',
  website: '',
  file_size: '',
  icon_file: null, // Use a file object instead of URL
});
const selectedApp = ref(null); // For deletion
const apps = ref([]);  // Store fetched apps

// Notification reactive variable
const notificationMessage = ref(''); // Message for the notification

// Trigger the notification with a custom message
const triggerNotification = (message) => {
  notificationMessage.value = message;
  setInterval(() => {
    notificationMessage.value = 'idle123';
  }, 3300);
};

const fetchCategories = async () => {
  try {
    const response = await fetch(`${serverAPI}/categories`);
    const data = await response.json();
    categories.value = data;  // Update the categories array
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const fetchApps = async () => {
  try {
    const response = await fetch(`${serverAPI}/apps`);
    const data = await response.json();
    apps.value = data;  // Update the apps array
  } catch (error) {
    console.error('Error fetching apps:', error);
  }
};

const optimizeAndUploadIcon = async (iconFile) => {
  // Max dimensions for app icons
  const MAX_WIDTH = 256;
  const MAX_HEIGHT = 256;
  // Max file size in bytes (100KB)
  const MAX_FILE_SIZE = 100 * 1024;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP for better compression
      canvas.toBlob((blob) => {
        if (blob.size > MAX_FILE_SIZE) {
          // Further compress if still too large
          const quality = (MAX_FILE_SIZE / blob.size) * 0.9;
          canvas.toBlob((finalBlob) => {
            resolve(new File([finalBlob], 'icon.webp', { type: 'image/webp' }));
          }, 'image/webp', quality);
        } else {
          resolve(new File([blob], 'icon.webp', { type: 'image/webp' }));
        }
      }, 'image/webp', 0.9);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(iconFile);
  });
};

const addApp = async () => {
  const formData = new FormData();
  formData.append('name', newApp.value.name);
  formData.append('description', newApp.value.description);
  formData.append('category', newApp.value.category);
  formData.append('website', newApp.value.website);
  formData.append('file_size_kb', newApp.value.file_size); // Updated field name

  if (newApp.value.icon_file) {
    const optimizedIcon = await optimizeAndUploadIcon(newApp.value.icon_file);
    formData.append('icon', optimizedIcon);
  }

  try {
    const response = await fetch(`${serverAPI}/apps`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      await fetchApps();
      newApp.value = {
        name: '',
        description: '',
        category: '',
        website: '',
        file_size: '',
        icon_file: null,
      };
      triggerNotification('App added successfully!');
    } else {
      console.error('Error adding app:', await response.text());
      triggerNotification('Error adding app!');
    }
  } catch (error) {
    console.error('Error adding app:', error);
    triggerNotification('Error adding app!');
  }
};

const handleFileChange = (event) => {
  newApp.value.icon_file = event.target.files[0];
};

const addCategory = async () => {
  const categoryName = newCategoryName.value.trim();
  
  // Check if newCategoryId is a valid string
  const categoryId = typeof newCategoryId.value === 'string' ? newCategoryId.value.trim() : null;

  if (!categoryName) {
    triggerNotification("Category name is required.");
    return;
  }

  try {
    const response = await fetch(`${serverAPI}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: categoryId, // Null if not provided
        category_name: categoryName
      })
    });

    if (response.ok) {
      await fetchCategories();
      triggerNotification(categoryId ? 'Category updated successfully!' : 'New category added successfully!');
    } else {
      console.error("Error:", await response.text());
      triggerNotification('Error updating/adding category!');
    }
  } catch (error) {
    console.error("Error adding category:", error);
    triggerNotification('Error adding category!');
  }
};

const deleteCategory = async () => {
  if (!selectedCategory.value) {
    triggerNotification("Please select a category to delete.");
    return;
  }

  const categoryId = selectedCategory.value.category_id;

  try {
    const response = await fetch(`${serverAPI}/categories/${categoryId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchCategories(); // Refresh categories after deletion
      triggerNotification('Category deleted successfully!');
    } else {
      console.error("Error deleting category:", await response.text());
      triggerNotification('Error deleting category!');
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    triggerNotification('Error deleting category!');
  }
};

const deleteApp = async () => {
  if (!selectedApp.value) {
    triggerNotification("Please select an app to delete.");
    return;
  }

  const appId = selectedApp.value.app_id;

  try {
    const response = await fetch(`${serverAPI}/apps/${appId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      triggerNotification("App deleted!");
      await fetchApps();  // Refresh apps after deletion
      triggerNotification('App deleted successfully!');
    } else {
      console.error("Error deleting app:", await response.text());
      triggerNotification('Error deleting app!');
    }
  } catch (error) {
    console.error("Error deleting app:", error);
    triggerNotification('Error deleting app!');
  }
};
</script>

<template>
  <Navbar @toggled="toggleTheme" />
  <MainContainer :theme="theme" id="manageAppDB" class="form-container">
    <h1 class="page-title">Add an App</h1>
    <form @submit.prevent="addApp" class="form">
      <input v-model="newApp.name" type="text" placeholder="App Name" class="input-field" :class="theme" required />
      <textarea v-model="newApp.description" placeholder="Description" class="input-field" :class="theme"
        style="resize: none;" required></textarea>
      <select v-model="newApp.category" class="input-field" :class="theme" @click="fetchCategories" required>
        <option disabled value="">Select a Category</option>
        <option v-for="category in categories" :key="category.category_id" :value="category.category_id">
          {{ category.category_name }}
        </option>
      </select>
      <input v-model="newApp.website" type="text" placeholder="Developer Website" class="input-field" :class="theme"
        required />
      <input v-model="newApp.file_size" type="number" placeholder="File Size (in KB)" class="input-field" :class="theme"
        required />
      <input type="file" class="input-field" :class="theme" @change="handleFileChange" accept="image/*" required />
      <button type="submit" class="submit-button">Add App</button>
    </form>

    <ul class="app-list">
      <li v-for="app in apps" :key="app.app_id" class="app-item">
        <img 
          v-if="app.icon_file_location" 
          :src="`http://localhost:${serverPort}${app.icon_file_location}`"
          alt="App Icon" 
          class="app-icon"
        />
        <div class="app-info">
          <h3>{{ app.name }}</h3>
          <p>{{ app.description }}</p>
        </div>
      </li>
    </ul>
  </MainContainer>

  <MainContainer :theme="theme" class="form-container">
    <h1 class="page-title">Add a Category</h1>
    <form @submit.prevent="addCategory" class="form">
      <input v-model="newCategoryName" type="text" placeholder="Category Name" class="input-field" :class="theme"
        required />
      <input v-model="newCategoryId" type="number" placeholder="Category ID (Only enter if updating)"
        class="input-field" :class="theme" />
      <button type="submit" class="submit-button">Add/Update Category</button>
    </form>
  </MainContainer>

  <MainContainer :theme="theme" class="form-container">
    <h1 class="page-title">Delete Category</h1>
    <form @submit.prevent="deleteCategory" class="form">
      <select v-model="selectedCategory" class="input-field" :class="theme" @click="fetchCategories" required>
        <option disabled value="">Select a Category to Delete</option>
        <option v-for="category in categories" :key="category.category_id" :value="category">
          {{ category.category_name }}
        </option>
      </select>
      <button type="submit" class="submit-button">Delete Category</button>
    </form>

    <h1 class="page-title">Delete App</h1>
    <form @submit.prevent="deleteApp" class="form">
      <select v-model="selectedApp" class="input-field" :class="theme" @click="fetchApps" required>
        <option disabled value="">Select an App to Delete</option>
        <option v-for="app in apps" :key="app.app_id" :value="app">
          {{ app.name }}
        </option>
      </select>
      <button type="submit" class="submit-button">Delete App</button>
    </form>
  </MainContainer>

  <NotificationPopup :message="notificationMessage" :duration="3000" />
  <ConfirmationModal ref="confirmationModal"/>
</template>



<style scoped>
/* General Styles */
.form-container {
  padding: 20px;
  max-width: 800px;
  margin: auto;
  margin-top: 7vh;
  margin-bottom: 7vh;
  border-radius: 10px;
  border: none;
  opacity: 0;
}

.form-container:nth-child(2) {
  animation: fadeIn 0.5s ease-out .2s forwards;
} 

.form-container:nth-child(3) {
  animation: fadeIn 0.5s ease-out .25s forwards;
} 

.form-container:nth-child(4) {   
  animation: fadeIn 0.5s ease-out .3s forwards;
} 

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Title */
.page-title {
  font-size: 2rem;
  font-weight: 400;
  margin-bottom: 20px;
  text-align: center;
}

/* Form Styles */
.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-field {
  padding: 12px;
  border: none;
  border-radius: 3px;
  font-family: inherit;
  font-size: 16px;
  transition: box-shadow 0.3s ease-in-out;
}

.input-field:focus {
  outline: none;
  box-shadow: 0 0 8px var(--dark-blue);
}

.input-field.dark {
  background-color: var(--first-layer-dark);
  color: var(--text-color-dark);
}

.input-field.light {
  background-color: var(--first-layer-light);
  color: var(--text-color-light);
}

.input-field.dark::placeholder {
  color: #aaa;
}

.input-field.light::placeholder {
  color: #777;
}

.submit-button {
  background-color: var(--blue-gray);
  color: white;
  padding: 12px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-button:hover {
  background-color: var(--dark-blue);
}

.app-list {
  list-style: none;
  padding: 0;
}

.app-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.app-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 20px;
}

.app-info h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.app-info p {
  margin: 5px 0;
  color: #666;
}
</style>
