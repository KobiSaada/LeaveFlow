<script setup lang="ts">
import type { VacationRequestEventDto } from '@leaveflow/contracts';
import { onMounted, ref } from 'vue';
import { type ApiError, toApiError } from '@/shared/api/http';
import { vacationRequestsApi } from '@/features/vacation-requests/vacation-requests.api';
import { formatTimestamp } from '@/shared/utils/dates';

const props = defineProps<{ requestId: string }>();
const events = ref<VacationRequestEventDto[] | null>(null);
const error = ref<ApiError | null>(null);

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
    <ol v-else class="space-y-1 border-l border-slate-200 pl-3">
      <li v-for="event in events" :key="event.id">
        <span class="font-medium text-slate-800">{{ labels[event.eventType] }}</span>
        by {{ event.actor.name }} · {{ formatTimestamp(event.occurredAt) }}
      </li>
    </ol>
  </div>
</template>
