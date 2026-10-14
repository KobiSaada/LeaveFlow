<script setup lang="ts">
import BaseInput from '../ui/BaseInput.vue';

defineProps<{ min?: string; startError?: string; endError?: string }>();
const start = defineModel<string>('start', { default: '' });
const end = defineModel<string>('end', { default: '' });
</script>

<template>
  <fieldset class="grid gap-4 sm:grid-cols-2">
    <legend class="sr-only">Vacation dates</legend>
    <BaseInput
      v-model="start"
      label="Start date"
      type="date"
      required
      :min="min"
      :error="startError"
    />
    <BaseInput
      v-model="end"
      label="End date"
      type="date"
      required
      :min="start || min"
      :error="endError"
      hint="Must be after the start date."
    />
  </fieldset>
</template>
