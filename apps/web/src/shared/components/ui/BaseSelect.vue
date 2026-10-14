<script setup lang="ts">
import { useId } from 'vue';

defineProps<{ label: string; options: Array<{ value: string; label: string }> }>();
const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-slate-700">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      class="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-xs"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
