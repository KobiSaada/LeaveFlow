<script setup lang="ts">
import { addDays, isValidIsoDate } from '@leaveflow/contracts';
import { computed } from 'vue';
import BaseInput from '@/shared/components/ui/BaseInput.vue';

const props = defineProps<{ min?: string; startError?: string; endError?: string }>();
const start = defineModel<string>('start', { default: '' });
const end = defineModel<string>('end', { default: '' });

// The end date is the return date, so the earliest valid one is the day after the start.
const earliestEnd = computed(() =>
  isValidIsoDate(start.value) ? addDays(start.value, 1) : props.min,
);
</script>

<template>
  <fieldset class="grid gap-4 sm:grid-cols-2">
    <legend class="sr-only">Vacation dates</legend>
    <BaseInput
      v-model="start"
      label="Start date"
      hint="Your first day off."
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
      :min="earliestEnd"
      :error="endError"
      hint="Your first day back at work — 2 Nov → 3 Nov is one day off."
    />
  </fieldset>
</template>
