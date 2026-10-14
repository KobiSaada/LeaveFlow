<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import type { Component } from 'vue';

withDefaults(defineProps<{ title: string; description?: string; icon?: Component }>(), {
  description: undefined,
  icon: () => Inbox,
});
</script>

<template>
  <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
    <span
      class="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      aria-hidden="true"
    >
      <component :is="icon" class="size-6" />
    </span>
    <p class="mt-4 font-medium text-slate-800">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex justify-center"><slot /></div>
  </div>
</template>
