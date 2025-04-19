<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { tsParticles } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

const props = defineProps({
  styleType: {
    type: String,
    default: 'geometric',
    validator: (value) => [
      'geometric',
      'geometric-dots',
      'geometric-hexagons',
      'geometric-crosses',
      'geometric-triangles',
      'geometric-squares',
      'geometric-zigzag',
      'gradient-waves',
      'particles',
      'blur-app',
      'gradient-texture',
      'fluid-mesh',
      'diagonal-lines',
      'soft-gradients',
      'subtle-noise',
      'abstract-blobs',
      'light-grid',
      'gradient-animated',
      'watercolor',
      'cosmic'
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
            area: 700,
          },
          value: 125,
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
  <div class="background-wrapper" :class="props.styleType">
    <div v-if="props.styleType === 'particles'" id="particles-background" class="particles-container"></div>
    <slot></slot>
  </div>
</template>

<style scoped>
.background-wrapper {
  position: fixed;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  padding: 0;
  margin: 0;
  transform: none;
}

.background-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(80px);
  -webkit-backdrop-filter: blur(80px);
  opacity: 0.3;
  pointer-events: none;
}

/* 1. Gradient with Light Abstract Waves */
.gradient-waves {
  background: linear-gradient(135deg, #c2d6ff 0%, #4a90e2 100%);
  filter: blur(60px);
}

.gradient-waves::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%234A90E2' fill-opacity='0.05' d='M49,-50.7C62.5,-36.2,70.7,-18.1,70.6,-0.1C70.5,17.9,62.1,35.8,48.6,50.3C35.1,64.8,16.6,75.9,-2.2,78.1C-20.9,80.3,-41.8,73.6,-56.2,59.1C-70.6,44.6,-78.4,22.3,-77.9,0.3C-77.4,-21.7,-68.6,-43.4,-54.2,-57.9C-39.8,-72.4,-19.9,-79.7,-0.7,-79C18.5,-78.3,37,-69.6,49,-50.7Z' transform='translate(100 100)' /%3E%3C/svg%3E");
  opacity: 0.6;
  animation: waveAnimation 15s ease-in-out infinite alternate;
}

@keyframes waveAnimation {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-5%, 5%) rotate(2deg); }
  50% { transform: translate(5%, -5%) rotate(-2deg); }
  75% { transform: translate(-5%, 5%) rotate(2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

/* 2. Geometric Pattern */
.geometric {
  background-color: #e4ecff;
  background-image: 
    linear-gradient(rgba(74, 144, 226, 0.3) 2px, transparent 2px),
    linear-gradient(90deg, rgba(74, 144, 226, 0.3) 2px, transparent 2px),
    linear-gradient(rgba(74, 144, 226, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 144, 226, 0.2) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position: -2px -2px, -2px -2px, -1px -1px, -1px -1px;
  /* Removed filter: blur(60px); */
}

/* New Geometric Variations */
.geometric-dots {
  background-color: #f5f7ff;
  background-image: 
    radial-gradient(circle, #4a90e2 1px, transparent 1px),
    radial-gradient(circle, #4a90e2 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: 0 0, 20px 20px;
}

.geometric-hexagons {
  background-color: #f0f4ff;
  background-image: 
    linear-gradient(30deg, #4a90e2 12%, transparent 12.5%, transparent 87%, #4a90e2 87.5%, #4a90e2),
    linear-gradient(150deg, #4a90e2 12%, transparent 12.5%, transparent 87%, #4a90e2 87.5%, #4a90e2),
    linear-gradient(30deg, #4a90e2 12%, transparent 12.5%, transparent 87%, #4a90e2 87.5%, #4a90e2),
    linear-gradient(150deg, #4a90e2 12%, transparent 12.5%, transparent 87%, #4a90e2 87.5%, #4a90e2),
    linear-gradient(60deg, rgba(74,144,226,0.1) 25%, transparent 25.5%, transparent 75%, rgba(74,144,226,0.1) 75%, rgba(74,144,226,0.1)),
    linear-gradient(60deg, rgba(74,144,226,0.1) 25%, transparent 25.5%, transparent 75%, rgba(74,144,226,0.1) 75%, rgba(74,144,226,0.1));
  background-size: 80px 140px;
  background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
}

.geometric-crosses {
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #4a90e2 25%, transparent 25%),
    linear-gradient(-45deg, #4a90e2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #4a90e2 75%),
    linear-gradient(-45deg, transparent 75%, #4a90e2 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.geometric-triangles {
  --size: 60px;
  --color: rgba(74, 144, 226, 0.2);
  background-color: #f8faff;
  background-image:
    linear-gradient(30deg, var(--color) 12%, transparent 12.5%, transparent 87%, var(--color) 87.5%, var(--color)),
    linear-gradient(150deg, var(--color) 12%, transparent 12.5%, transparent 87%, var(--color) 87.5%, var(--color)),
    linear-gradient(30deg, var(--color) 12%, transparent 12.5%, transparent 87%, var(--color) 87.5%, var(--color)),
    linear-gradient(150deg, var(--color) 12%, transparent 12.5%, transparent 87%, var(--color) 87.5%, var(--color)),
    linear-gradient(60deg, var(--color) 25%, transparent 25.5%, transparent 75%, var(--color) 75%, var(--color)),
    linear-gradient(60deg, var(--color) 25%, transparent 25.5%, transparent 75%, var(--color) 75%, var(--color));
  background-size: var(--size) calc(var(--size) * 1.73);
}

.geometric-squares {
  background-color: #ffffff;
  background-image:
    linear-gradient(#4a90e2 2px, transparent 2px),
    linear-gradient(90deg, #4a90e2 2px, transparent 2px),
    linear-gradient(rgba(74, 144, 226, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 144, 226, 0.3) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position: -2px -2px, -2px -2px, -1px -1px, -1px -1px;
}

.geometric-zigzag {
  background-color: #f0f4ff;
  background-image:
    linear-gradient(135deg, #4a90e2 25%, transparent 25%),
    linear-gradient(225deg, #4a90e2 25%, transparent 25%),
    linear-gradient(315deg, #4a90e2 25%, transparent 25%),
    linear-gradient(45deg, #4a90e2 25%, transparent 25%);
  background-size: 40px 40px;
  background-position: 0 0, 20px 0, 20px -20px, 0 20px;
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

/* 4. Blur App Background */
.blur-app {
  background: linear-gradient(135deg, #4a90e2 0%, #c2d6ff 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 5. Gradient Texture */
.gradient-texture {
  background: linear-gradient(135deg, #4a90e2 0%, #82b1ff 100%);
  position: relative;
  filter: blur(60px);
}

.gradient-texture::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.7;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
}

/* 6. Fluid Mesh Background */
.fluid-mesh {
  background-color: #4a90e2;
  background-image:
    radial-gradient(circle at 15% 25%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 60%),
    radial-gradient(circle at 75% 40%, rgba(130, 177, 255, 0.9) 0%, rgba(130, 177, 255, 0) 65%),
    radial-gradient(circle at 50% 85%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 70%);
  animation: float 15s ease-in-out infinite alternate;
  filter: blur(60px);
}

@keyframes float {
  0%, 100% { background-position: 0% 0%, 0% 0%, 0% 0%; }
  25% { background-position: -5% -5%, 5% 5%, 0% 10%; }
  50% { background-position: 5% 5%, -5% -5%, 10% 0%; }
  75% { background-position: -5% 5%, 5% -5%, 0% -10%; }
}

/* 7. Diagonal Lines */
.diagonal-lines {
  background-image: repeating-linear-gradient(
    45deg,
    #d1deff,
    #d1deff 1px,
    #f5f7ff 1px,
    #f5f7ff 10px
  );
}/* 7. Diagonal Lines */
.diagonal-lines {
  background-image: repeating-linear-gradient(
    45deg,
    #e4ecff,
    #e4ecff 1px,
    #f5f7ff 1px,
    #f5f7ff 10px
  );
  /* No blur */
}

/* 8. Soft Gradients */
.soft-gradients {
  background: linear-gradient(120deg, #f0f4ff 0%, #cce0ff 100%);
}

/* 9. Subtle Noise */
.subtle-noise {
  background-color: #f5f7ff;
  background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%234a90e2' fill-opacity='0.03'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3Ccircle cx='11' cy='11' r='1'/%3E%3Ccircle cx='6' cy='16' r='1'/%3E%3Ccircle cx='16' cy='6' r='1'/%3E%3C/g%3E%3C/svg%3E");
}

/* 10. Abstract Blobs */
.abstract-blobs {
  background-color: #4a90e2;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(130, 177, 255, 0.8) 0%, transparent 50%),
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 45%);
  animation: blobAnimation 20s ease infinite;
  filter: blur(60px);
}

@keyframes blobAnimation {
  0% { background-size: 100% 100%, 100% 100%, 100% 100%; }
  50% { background-size: 150% 150%, 150% 150%, 150% 150%; }
  100% { background-size: 100% 100%, 100% 100%, 100% 100%; }
}

/* 11. Light Grid */
.light-grid {
  background-color: #f8faff;
  background-image: 
    linear-gradient(rgba(74, 144, 226, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 144, 226, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 12. Animated Gradient */
.gradient-animated {
  background: linear-gradient(270deg, #4a90e2, #82b1ff, #c2d6ff);
  background-size: 600% 600%;
  animation: gradientAnimation 8s ease infinite;
  filter: blur(60px);
}

@keyframes gradientAnimation {
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
}

/* 13. Watercolor Effect */
.watercolor {
  background: 
    radial-gradient(circle at 30% 40%, #82b1ff 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, #4a90e2 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, #c2d6ff 0%, transparent 50%);
  animation: watercolorShift 15s ease-in-out infinite alternate;
  filter: blur(60px);
}

@keyframes watercolorShift {
  0% { background-size: 100% 100%, 100% 100%, 100% 100%; }
  50% { background-size: 120% 120%, 120% 120%, 120% 120%; }
  100% { background-size: 100% 100%, 100% 100%, 100% 100%; }
}

/* 14. Circuit Board */
.circuit-board {
  background-color: #4a90e2;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
  background-size: 50px 50px, 50px 50px, 10px 10px, 10px 10px;
  background-position: -2px -2px, -2px -2px, -1px -1px, -1px -1px;
  /* Removed filter: blur(60px); */
}

/* 15. Cosmic */
.cosmic {
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
  position: relative;
  overflow: hidden;
  filter: blur(60px);
}

.cosmic::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px),
    radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px),
    radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 3px);
  background-size: 550px 550px, 350px 350px, 250px 250px;
  background-position: 0 0, 40px 60px, 130px 270px;
  animation: starsAnimation 50s linear infinite;
}

@keyframes starsAnimation {
  from { transform: translateY(0); }
  to { transform: translateY(-1350px); }
}

/* Keep particles unblurred */
.particles-container {
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: 0;
  filter: none;
}

/* Adjust positioning of content to account for padding */
:deep(.particles-container) {
  position: absolute;
  top: -60px;
  left: -60px;
  right: -60px;
  bottom: -60px;
  width: calc(100% + 120px);
  height: calc(100% + 120px);
  z-index: 0;
  filter: none;
}

/* Keep blur effect only for gradient-based backgrounds */
.gradient-waves,
.blur-app,
.gradient-texture,
.fluid-mesh,
.abstract-blobs,
.gradient-animated,
.watercolor,
.cosmic {
  filter: blur(60px);
}
</style>
