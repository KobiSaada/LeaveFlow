<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next';
import { type Component, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    /** Leading icon (decorative). */
    icon?: Component;
  }>(),
  {
    variant: 'primary',
    type: 'button',
    loading: false,
    disabled: false,
    size: 'md',
    icon: undefined,
  },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
  props.size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm',
  {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 shadow-none hover:bg-slate-100',
  }[props.variant],
]);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <LoaderCircle v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" class="size-4" aria-hidden="true" />
    <slot />
  </button>
</template>
