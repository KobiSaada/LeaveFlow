<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="space-y-3" role="status" aria-live="polite">
    <span class="sr-only">Loading…</span>
    <div v-for="i in rows" :key="i" class="h-14 animate-pulse rounded-lg bg-slate-200/70" />
  </div>
</template>
