<script setup lang="ts">
import type { PageInfo } from '@leaveflow/contracts';
import BaseButton from './BaseButton.vue';

const props = defineProps<{ pageInfo: PageInfo; disabled?: boolean }>();
const emit = defineEmits<{ 'update:page': [page: number] }>();

const go = (page: number) => {
  if (page >= 1 && page <= props.pageInfo.totalPages) emit('update:page', page);
};
</script>

<template>
  <nav
    v-if="pageInfo.totalPages > 1"
    class="flex items-center justify-between gap-3 pt-4"
    aria-label="Pagination"
  >
    <p class="text-sm text-slate-600">
      Page <span class="font-medium">{{ pageInfo.page }}</span> of
      <span class="font-medium">{{ pageInfo.totalPages }}</span>
      <span class="hidden sm:inline"> · {{ pageInfo.totalItems }} requests</span>
    </p>
    <div class="flex gap-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="disabled || pageInfo.page <= 1"
        @click="go(pageInfo.page - 1)"
      >
        Previous
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="disabled || pageInfo.page >= pageInfo.totalPages"
        @click="go(pageInfo.page + 1)"
      >
        Next
      </BaseButton>
    </div>
  </nav>
</template>
