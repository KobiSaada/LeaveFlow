<script setup lang="ts">
import type { VacationRequestEventDto } from '@leaveflow/contracts';
import { Check, Send, X } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { type ApiError, toApiError } from '@/shared/api/http';
import { vacationRequestsApi } from '@/features/vacation-requests/vacation-requests.api';
import { formatTimestamp } from '@/shared/utils/dates';

const props = defineProps<{ requestId: string }>();
const events = ref<VacationRequestEventDto[] | null>(null);
const error = ref<ApiError | null>(null);

const markers = {
  VacationRequestCreated: { icon: Send, classes: 'bg-indigo-100 text-indigo-600' },
  VacationRequestApproved: { icon: Check, classes: 'bg-emerald-100 text-emerald-600' },
  VacationRequestRejected: { icon: X, classes: 'bg-rose-100 text-rose-600' },
} as const;

const labels: Record<VacationRequestEventDto['eventType'], string> = {
  VacationRequestCreated: 'Submitted',
  VacationRequestApproved: 'Approved',
  VacationRequestRejected: 'Rejected',
};

onMounted(async () => {
  try {
    events.value = await vacationRequestsApi.events(props.requestId);
  } catch (e) {
    error.value = toApiError(e);
  }
});
</script>

<template>
  <div class="mt-2 text-left text-xs text-slate-600">
    <p v-if="error" class="text-rose-700">{{ error.message }}</p>
    <p v-else-if="!events">Loading history…</p>
    <ol v-else class="relative space-y-2 border-l border-slate-200 pl-4">
      <li v-for="event in events" :key="event.id" class="relative">
        <span
          class="absolute top-0.5 -left-[1.4rem] flex size-4 items-center justify-center rounded-full ring-2 ring-white"
          :class="markers[event.eventType].classes"
          aria-hidden="true"
        >
          <component :is="markers[event.eventType].icon" class="size-2.5" />
        </span>
        <span class="font-medium text-slate-800">{{ labels[event.eventType] }}</span>
        by {{ event.actor.name }} · {{ formatTimestamp(event.occurredAt) }}
      </li>
    </ol>
  </div>
</template>
