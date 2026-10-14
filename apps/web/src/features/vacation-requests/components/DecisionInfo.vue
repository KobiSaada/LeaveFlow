<script setup lang="ts">
import type { VacationRequestDto } from '@leaveflow/contracts';
import { formatTimestamp } from '@/shared/utils/dates';

defineProps<{ request: VacationRequestDto }>();
</script>

<template>
  <div v-if="request.decidedBy" class="text-sm">
    <p class="text-slate-600">
      by {{ request.decidedBy.name
      }}<span v-if="request.decidedAt"> · {{ formatTimestamp(request.decidedAt) }}</span>
    </p>
    <p
      v-if="request.comments"
      class="mt-1 text-slate-800"
      :class="request.status === 'REJECTED' ? 'font-medium' : ''"
    >
      “{{ request.comments }}”
    </p>
  </div>
  <span v-else class="text-sm text-slate-400">Awaiting decision</span>
</template>
