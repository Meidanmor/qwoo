<!-- src/components/AppCarousel.vue -->
<template>
  <q-carousel
    :key="carouselKey"
    v-model="slide"
    animated
    swipeable
    :infinite="showControls"
    :navigation="showControls"
    :arrows="false"
    height="auto"
    control-color="primary"
    class="rounded-borders"
    tabindex="0"
    @pointerdown.stop
    @keydown="onKeydown"
  >
    <slot />

<template v-if="showControls" #navigation-icon="{ name, onClick }">
  <q-btn
    :flat="false"
    size="sm"
    round dense
    :icon="null"
    :style="{
      background: Number(slide) === Number(name) ? 'var(--q-secondary)' : '#9e9e9e',
      fontSize: '5px',
      padding: 0
    }"
    :aria-label="`Go to slide ${name + 1}`"
    @click="onClick"
  />
</template>

    <template v-if="showControls" #control>
      <q-carousel-control position="left" class="flex items-center">
        <q-btn flat dense color="secondary"
          aria-label="Previous slide"
          @click="slide = (slide - 1 + total) % total"
        >
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--q-secondary)" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
          </svg>
        </q-btn>
      </q-carousel-control>
      <q-carousel-control position="right" class="flex items-center">
        <q-btn flat dense color="secondary"
          aria-label="Next slide"
          @click="slide = (slide + 1) % total"
        >
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--q-secondary)" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </q-btn>
      </q-carousel-control>
    </template>
  </q-carousel>
</template>

<script setup>
defineProps({
  carouselKey: Number,
  showControls: Boolean,
  total:        Number,
  onKeydown:    Function,
})

const slide = defineModel()
</script>