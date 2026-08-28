export function useCarouselKeyboard(slideRef, totalSlidesRef) {
  function onKeydown(e) {
    switch (e.key) {
      case 'ArrowRight':
        slideRef.value =
          (slideRef.value + 1) % totalSlidesRef.value
        break

      case 'ArrowLeft':
        slideRef.value =
          (slideRef.value - 1 + totalSlidesRef.value) % totalSlidesRef.value
        break

      case 'Home':
        slideRef.value = 0
        break

      case 'End':
        slideRef.value = totalSlidesRef.value - 1
        break
    }
  }

  return {
    onKeydown
  }
}