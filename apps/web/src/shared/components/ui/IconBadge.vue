<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(
  defineProps<{ icon: Component; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' }>(),
  {
    tone: 'indigo',
  },
);

const tones = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  slate: 'bg-slate-100 text-slate-500 ring-slate-200',
};
</script>

<template>
  <span
    class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
    :class="tones[tone]"
    aria-hidden="true"
  >
    <component :is="icon" class="size-5" :stroke-width="2" />
  </span>
</template>
