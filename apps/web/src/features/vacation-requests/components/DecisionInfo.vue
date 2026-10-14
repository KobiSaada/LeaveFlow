<script setup lang="ts">
import type { VacationRequestDto } from '@leaveflow/contracts';
import { Hourglass, MessageSquareQuote } from 'lucide-vue-next';
import { formatTimestamp } from '@/shared/utils/dates';

defineProps<{ request: VacationRequestDto }>();
</script>

<template>
  <div v-if="request.decidedBy" class="text-sm">
    <p class="text-slate-600">
      by <span class="font-medium text-slate-700">{{ request.decidedBy.name }}</span
      ><span v-if="request.decidedAt" class="text-slate-500">
        · {{ formatTimestamp(request.decidedAt) }}</span
      >
    </p>
    <p
      v-if="request.comments"
      class="mt-1.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-left"
      :class="
        request.status === 'REJECTED' ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-700'
      "
    >
      <MessageSquareQuote class="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span>{{ request.comments }}</span>
    </p>
  </div>
  <span v-else class="inline-flex items-center gap-1.5 text-sm text-slate-400">
    <Hourglass class="size-3.5" aria-hidden="true" />Awaiting decision
  </span>
</template>
