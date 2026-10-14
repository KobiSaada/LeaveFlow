<script setup lang="ts">
import type { Component } from 'vue';
import IconBadge from './IconBadge.vue';

defineProps<{ title: string; description?: string; icon?: Component }>();
</script>

<template>
  <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <div class="flex min-w-0 items-center gap-3">
      <IconBadge v-if="icon" :icon="icon" />
      <div class="min-w-0">
        <h1
          class="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
        >
          {{ title }}
          <slot name="meta" />
        </h1>
        <p v-if="description" class="mt-0.5 text-sm text-slate-500">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
