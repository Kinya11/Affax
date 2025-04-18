<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { tsParticles } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

const props = defineProps({
  styleType: {
    type: String,
    default: 'gradient-waves',
    validator: (value) => [
      'gradient-waves',
      'geometric',
      'particles',
      'blur-app',
      'gradient-texture'
    ].includes(value)
  }
});

const isParticlesLoaded = ref(false);

onMounted(async () => {
  if (props.styleType === 'particles') {
    await initParticles();
    isParticlesLoaded.value = true;
  }
});

onBeforeUnmount(async () => {
  if (props.styleType === 'particles' && isParticlesLoaded.value) {
    try {
      const container = tsParticles.domItem(0);
      if (container) {
        await container.destroy();
      }
    } catch (error) {
      console.error('Error cleaning up particles:', error);
    }
  }
});

const initParticles = async () => {
  try {
    await loadSlim(tsParticles);
    
    await tsParticles.load('particles-background', {
      fullScreen: { enable: false },
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 120,
      particles: {
        color: {
          value: '#4A90E2',
        },
        links: {
          color: '#4A90E2',
          distance: 150,
          enable: true,
          opacity: 0.5,
          width: 1.5,
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: {
            default: 'bounce',
          },
          random: false,
          speed: 2,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 700, // Middle ground between 600 and 800
          },
          value: 125, // Middle ground between 100 and 150
        },
        opacity: {
          value: 0.7,
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: 1, max: 3 },
        },
      },
      detectRetina: true,
    });
  } catch (error) {
    console.error('Failed to initialize particles:', error);
  }
};
</script>

<template>
  <div class="background-wrapper">
    <div v-if="props.styleType === 'particles'" id="particles-background" class="particles-container"></div>
    <slot></slot>
  </div>
</template>

<style scoped>
.background-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 1. Gradient with Light Abstract Waves */
.gradient-waves {
  background: linear-gradient(135deg, #f5f7ff 0%, #e4ecff 100%);
  position: relative;
}

.gradient-waves::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.3;
}

/* 2. Geometric Pattern */
.geometric-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f5f7ff;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234a90e2' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: -1;
}

/* 3. Particles Background */
#particles-background {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.background-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  z-index: 5;
}

/* 4. Blur App Background */
.blur-app {
  background: rgba(245, 247, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 5. Gradient Texture */
.gradient-texture {
  background: linear-gradient(135deg, #d3e5ff 0%, #f0f4ff 100%);
  position: relative;
}

.gradient-texture::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
