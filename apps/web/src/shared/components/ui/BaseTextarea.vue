<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  label: string;
  maxlength: number;
  error?: string;
  required?: boolean;
  rows?: number;
}>();
const model = defineModel<string>({ default: '' });
const id = useId();
defineExpose({ focus: () => document.getElementById(id)?.focus() });
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between">
      <label :for="id" class="text-sm font-medium text-slate-700">
        {{ label }}<span v-if="required" class="text-rose-600" aria-hidden="true"> *</span>
      </label>
      <span class="text-xs text-slate-500" aria-hidden="true"
        >{{ model.length }}/{{ maxlength }}</span
      >
    </div>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows ?? 3"
      :maxlength="maxlength"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="rounded-lg border bg-white px-3 py-2 text-sm shadow-xs"
      :class="error ? 'border-rose-500' : 'border-slate-300'"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-rose-700">{{ error }}</p>
  </div>
</template>
