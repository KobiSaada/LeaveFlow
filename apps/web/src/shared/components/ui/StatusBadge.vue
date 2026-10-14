<script setup lang="ts">
import type { VacationRequestStatus } from '@leaveflow/contracts';
import { CircleCheck, CircleX, Clock3 } from 'lucide-vue-next';

defineProps<{ status: VacationRequestStatus }>();

// Status is always spelled out — the icon and colour are secondary cues, never the only one.
const styles = {
  PENDING: {
    label: 'Pending',
    icon: Clock3,
    classes: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  },
  APPROVED: {
    label: 'Approved',
    icon: CircleCheck,
    classes: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
  },
  REJECTED: {
    label: 'Rejected',
    icon: CircleX,
    classes: 'bg-rose-50 text-rose-800 ring-rose-600/25',
  },
} as const;
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset"
    :class="styles[status].classes"
    :data-status="status"
  >
    <component :is="styles[status].icon" class="size-3.5" aria-hidden="true" />{{
      styles[status].label
    }}
  </span>
</template>
