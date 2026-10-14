<script setup lang="ts">
import BaseButton from './BaseButton.vue';

defineProps<{ message: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="rounded-xl border border-rose-200 bg-rose-50 px-6 py-6 text-center" role="alert">
    <p class="text-sm text-rose-800">{{ message }}</p>
    <BaseButton class="mt-4" variant="secondary" size="sm" @click="$emit('retry')"
      >Try again</BaseButton
    >
  </div>
</template>
