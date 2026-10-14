<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  label: string;
  type?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  autocomplete?: string;
  min?: string;
}>();
const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-slate-700">
      {{ label }}<span v-if="required" class="text-rose-600" aria-hidden="true"> *</span>
    </label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :required="required"
      :autocomplete="autocomplete"
      :min="min"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="min-h-11 rounded-lg border bg-white px-3 text-sm shadow-xs"
      :class="error ? 'border-rose-500' : 'border-slate-300'"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
