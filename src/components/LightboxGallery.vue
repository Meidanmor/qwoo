<template>
  <q-dialog
    v-model="isOpen"
    maximized
    transition-show="fade"
    transition-hide="fade"
    :no-backdrop-dismiss="zoom.scale > 1"
    @pointerdown.stop
  >
    <div
      class="lightbox-root"
      tabindex="0"
      ref="rootRef"
    >
      <!-- Header -->
      <div class="lightbox-header">
        <span class="lightbox-counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
        <q-btn
          round flat
          :icon="matClose"
          color="transparent"
          text-color="white"
          size="md"
          class="lightbox-close"
          @click="close"
        />
      </div>

      <!-- Main image area -->
      <div
        class="lightbox-stage"
        ref="stageRef"
        @wheel.prevent="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @dblclick="onDoubleClick"
        @touchstart.passive="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Slide wrapper -->
        <transition :name="slideDirection">
          <div
            class="lightbox-slide"
            :key="currentIndex"
          >
            <img
              :src="currentImage.src"
              :srcset="currentImage.srcset"
              :sizes="currentImage.sizes"
              :alt="currentImage.alt || ''"
              class="lightbox-img"
              :style="imgStyle"
              ref="imgRef"
              draggable="false"
            />
          </div>
        </transition>

        <!-- Arrows -->
        <template v-if="images.length > 1 && zoom.scale === 1">
          <button class="lightbox-arrow lightbox-arrow--left" @click.stop="navigate(-1)" :aria-label="'Previous image'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="lightbox-arrow lightbox-arrow--right" @click.stop="navigate(1)" :aria-label="'Next image'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>

        <!-- Zoom hint -->
        <transition name="fade-hint">
          <div v-if="showZoomHint" class="lightbox-zoom-hint">
            {{ zoom.scale > 1 ? 'Double-click to reset' : 'Double-click to zoom' }}
          </div>
        </transition>
      </div>

      <!-- Thumbnail strip -->
      <div v-if="images.length > 1" class="lightbox-thumbs" ref="thumbsRef">
        <div class="lightbox-thumbs-inner">
          <button
            v-for="(img, i) in images"
            :key="i"
            class="lightbox-thumb"
            :class="{ 'lightbox-thumb--active': i === currentIndex }"
            @click="goTo(i)"
            :aria-label="`View image ${i + 1}`"
          >
            <img :src="img.thumbnail || img.src" :alt="img.alt || ''" draggable="false" />
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { matClose } from '@quasar/extras/material-icons'

// ─── State ────────────────────────────────────────────────────────────────────
const isOpen       = ref(false)
const images       = ref([])
const currentIndex = ref(0)
const slideDirection = ref('slide-left')

const rootRef  = ref(null)
const stageRef = ref(null)
const imgRef   = ref(null)
const thumbsRef = ref(null)

// ─── Zoom / Pan ───────────────────────────────────────────────────────────────
const zoom = ref({
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
})

const showZoomHint = ref(false)
let zoomHintTimer = null

function triggerZoomHint() {
  showZoomHint.value = true
  clearTimeout(zoomHintTimer)
  zoomHintTimer = setTimeout(() => { showZoomHint.value = false }, 1500)
}

function resetZoom() {
  zoom.value = { scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 }
}

const imgStyle = computed(() => ({
  transform: `scale(${zoom.value.scale}) translate(${zoom.value.x}px, ${zoom.value.y}px)`,
  transition: zoom.value.dragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cursor: zoom.value.scale > 1 ? (zoom.value.dragging ? 'grabbing' : 'grab') : 'zoom-in',
  touchAction: 'none',
  userSelect: 'none',
}))

// ─── Computed ─────────────────────────────────────────────────────────────────
const currentImage = computed(() => images.value[currentIndex.value] || {})

// ─── Public API ───────────────────────────────────────────────────────────────
function open(imgArray, index = 0) {
  images.value   = imgArray
  currentIndex.value = index
  isOpen.value   = true
  resetZoom()
  nextTick(() => {
    rootRef.value?.focus()
    scrollThumbIntoView(index)
  })
}

function close() {
  isOpen.value = false
  resetZoom()
}

function navigate(dir) {
  if (zoom.value.scale > 1) return
  slideDirection.value = dir === 1 ? 'slide-left' : 'slide-right'
  currentIndex.value = (currentIndex.value + dir + images.value.length) % images.value.length
  resetZoom()
  scrollThumbIntoView(currentIndex.value)
}

function goTo(index) {
  slideDirection.value = index > currentIndex.value ? 'slide-left' : 'slide-right'
  currentIndex.value = index
  resetZoom()
  scrollThumbIntoView(index)
}

function scrollThumbIntoView(index) {
  nextTick(() => {
    if (!thumbsRef.value) return
    const thumb = thumbsRef.value.querySelectorAll('.lightbox-thumb')[index]
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  })
}

defineExpose({ open })

// ─── Keyboard ─────────────────────────────────────────────────────────────────
watch(isOpen, (val) => {
  if (val) {
    nextTick(() => rootRef.value?.focus())
    window.addEventListener('keydown', onKeyDown)
  } else {
    window.removeEventListener('keydown', onKeyDown)
  }
})

function onKeyDown(e) {
  if (!isOpen.value) return

  if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1) }
  if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
  if (e.key === 'Escape')     { e.preventDefault(); close() }
  if (e.key === 'ArrowUp')    { e.preventDefault(); adjustZoom(0.3) }
  if (e.key === 'ArrowDown')  { e.preventDefault(); adjustZoom(-0.3) }
}

function adjustZoom(delta) {
  const newScale = Math.min(Math.max(1, zoom.value.scale + delta), 4)
  if (newScale === 1) resetZoom()
  else zoom.value.scale = newScale
  triggerZoomHint()
}
// ─── Mouse: zoom & pan ────────────────────────────────────────────────────────
function onWheel(e) {
  adjustZoom(e.deltaY < 0 ? 0.15 : -0.15)
}


function onDoubleClick() {
  if (zoom.value.scale > 1) {
    resetZoom()
  } else {
    zoom.value.scale = 2.5
  }
  triggerZoomHint()
}

function onMouseDown(e) {
  if (zoom.value.scale === 1) return
  zoom.value.dragging = true
  zoom.value.startX   = e.clientX
  zoom.value.startY   = e.clientY
}

function onMouseMove(e) {
  if (!zoom.value.dragging || zoom.value.scale === 1) return
  zoom.value.x = zoom.value.lastX + (e.clientX - zoom.value.startX) / zoom.value.scale
  zoom.value.y = zoom.value.lastY + (e.clientY - zoom.value.startY) / zoom.value.scale
}

function onMouseUp() {
  if (!zoom.value.dragging) return
  zoom.value.dragging = false
  zoom.value.lastX    = zoom.value.x
  zoom.value.lastY    = zoom.value.y
}

// ─── Touch: pinch-zoom + swipe ────────────────────────────────────────────────
let touch = { startX: 0, startY: 0, dist: 0, lastScale: 1 }

function getTouchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e) {
  if (e.touches.length === 2) {
    touch.dist      = getTouchDist(e)
    touch.lastScale = zoom.value.scale
  } else {
    touch.startX = e.touches[0].clientX
    touch.startY = e.touches[0].clientY
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    const dist      = getTouchDist(e)
    const newScale  = Math.min(Math.max(1, touch.lastScale * (dist / touch.dist)), 4)
    if (newScale === 1) resetZoom()
    else zoom.value.scale = newScale
  } else if (e.touches.length === 1 && zoom.value.scale > 1) {
    // pan while zoomed
    const dx = (e.touches[0].clientX - touch.startX) / zoom.value.scale
    const dy = (e.touches[0].clientY - touch.startY) / zoom.value.scale
    zoom.value.x = zoom.value.lastX + dx
    zoom.value.y = zoom.value.lastY + dy
  }
}

function onTouchEnd(e) {
  if (zoom.value.scale > 1) {
    zoom.value.lastX = zoom.value.x
    zoom.value.lastY = zoom.value.y
    return
  }
  if (e.changedTouches.length === 1) {
    const dx = e.changedTouches[0].clientX - touch.startX
    const dy = e.changedTouches[0].clientY - touch.startY
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      navigate(dx < 0 ? 1 : -1)
    }
  }
}
</script>

<style scoped>
/* ─── Root ─────────────────────────────────────────────────────────────────── */
.lightbox-root {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  max-height: 100dvh;
  background: rgba(0, 0, 0, 0.96);
  outline: none;
  overflow: hidden;
  pointer-events: all !important;
}
/* ─── Header ───────────────────────────────────────────────────────────────── */
.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  flex-shrink: 0;
  z-index: 10;
}

.lightbox-counter {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}

.lightbox-close {
  opacity: 0.7;
  transition: opacity 0.2s;
}
.lightbox-close:hover { opacity: 1; }

/* ─── Stage ────────────────────────────────────────────────────────────────── */
.lightbox-stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}

/* ─── Slide ────────────────────────────────────────────────────────────────── */
.lightbox-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  will-change: transform;
}

/* ─── Slide transitions ────────────────────────────────────────────────────── */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.32s ease;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-left-enter-from  { transform: translateX(60px);  opacity: 0; }
.slide-left-leave-to    { transform: translateX(-60px); opacity: 0; }
.slide-right-enter-from { transform: translateX(-60px); opacity: 0; }
.slide-right-leave-to   { transform: translateX(60px);  opacity: 0; }

/* ─── Arrows ───────────────────────────────────────────────────────────────── */
.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  backdrop-filter: blur(8px);
  padding: 0;
}

.lightbox-arrow:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.3);
}

.lightbox-arrow--left  { left: 16px; }
.lightbox-arrow--right { right: 16px; }

.lightbox-arrow:hover.lightbox-arrow--left  { transform: translateY(-50%) translateX(-2px); }
.lightbox-arrow:hover.lightbox-arrow--right { transform: translateY(-50%) translateX(2px); }

/* ─── Zoom hint ────────────────────────────────────────────────────────────── */
.lightbox-zoom-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 20px;
  pointer-events: none;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}

.fade-hint-enter-active, .fade-hint-leave-active { transition: opacity 0.3s; }
.fade-hint-enter-from, .fade-hint-leave-to       { opacity: 0; }

/* ─── Thumbnails ───────────────────────────────────────────────────────────── */
.lightbox-thumbs {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lightbox-thumbs::-webkit-scrollbar { display: none; }

.lightbox-thumbs-inner {
  display: flex;
  gap: 8px;
  justify-content: center;
  min-width: min-content;
}

.lightbox-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.45;
  transition: opacity 0.2s, border-color 0.2s, transform 0.2s;
  padding: 0;
  background: none;
}

.lightbox-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lightbox-thumb:hover {
  opacity: 0.75;
  transform: translateY(-2px);
}

.lightbox-thumb--active {
  border-color: white;
  opacity: 1;
  transform: translateY(-2px);
}

/* ─── Dialog fade ──────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>