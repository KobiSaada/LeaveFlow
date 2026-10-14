<script setup lang="ts">
import type { VacationRequestStatus } from '@leaveflow/contracts';

defineProps<{ status: VacationRequestStatus }>();

// Status is always spelled out — colour is a secondary cue, never the only one.
const styles: Record<VacationRequestStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Pending', classes: 'bg-amber-50 text-amber-800 ring-amber-600/30' },
  APPROVED: { label: 'Approved', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-600/30' },
  REJECTED: { label: 'Rejected', classes: 'bg-rose-50 text-rose-800 ring-rose-600/30' },
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
    :class="styles[status].classes"
    :data-status="status"
  >
    {{ styles[status].label }}
  </span>
</template>
