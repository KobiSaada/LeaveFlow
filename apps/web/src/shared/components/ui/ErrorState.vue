<script setup lang="ts">
import { RefreshCw, TriangleAlert } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';

defineProps<{ message: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center" role="alert">
    <span
      class="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600"
      aria-hidden="true"
    >
      <TriangleAlert class="size-6" />
    </span>
    <p class="mt-4 text-sm text-rose-800">{{ message }}</p>
    <BaseButton class="mt-5" variant="secondary" size="sm" :icon="RefreshCw" @click="$emit('retry')"
      >Try again</BaseButton
    >
  </div>
</template>
