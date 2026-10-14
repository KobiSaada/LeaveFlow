<script setup lang="ts">
import { compareIsoDates, isValidIsoDate, REASON_MAX_LENGTH } from '@leaveflow/contracts';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toApiError } from '@/api/http';
import { vacationRequestsApi } from '@/api/vacation-requests';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import DateRangeFields from '@/components/vacation/DateRangeFields.vue';
import { useToast } from '@/composables/useToast';
import { dayCount, formatRange, todayLocal } from '@/utils/dates';
import { describeError } from '@/utils/errors';

const router = useRouter();
const toast = useToast();
const today = todayLocal();

const form = reactive({ startDate: '', endDate: '', reason: '' });
const serverErrors = reactive<{
  startDate?: string;
  endDate?: string;
  reason?: string;
  form?: string;
}>({});
const submitting = ref(false);
const touched = ref(false);
// One key per form session: a retry after a lost response replays instead of conflicting.
let idempotencyKey = crypto.randomUUID();

/** Instant feedback mirroring the server rules; the server remains the authority. */
const clientErrors = computed(() => {
  const errors: { startDate?: string; endDate?: string } = {};
  if (!form.startDate) errors.startDate = 'Start date is required.';
  else if (!isValidIsoDate(form.startDate)) errors.startDate = 'Enter a valid date.';
  else if (compareIsoDates(form.startDate, today) < 0)
    errors.startDate = "Start date can't be in the past.";
  if (!form.endDate) errors.endDate = 'End date is required.';
  else if (!isValidIsoDate(form.endDate)) errors.endDate = 'Enter a valid date.';
  else if (
    form.startDate &&
    isValidIsoDate(form.startDate) &&
    compareIsoDates(form.endDate, form.startDate) <= 0
  ) {
    errors.endDate = 'End date must be after the start date.';
  }
  return errors;
});

const shown = computed(() => ({
  startDate: (touched.value && clientErrors.value.startDate) || serverErrors.startDate,
  endDate: (touched.value && clientErrors.value.endDate) || serverErrors.endDate,
}));

const summary = computed(() =>
  !clientErrors.value.startDate && !clientErrors.value.endDate
    ? `${formatRange(form.startDate, form.endDate)} · ${dayCount(form.startDate, form.endDate)} days`
    : null,
);

function clearServerErrors(): void {
  for (const key of Object.keys(serverErrors) as Array<keyof typeof serverErrors>)
    delete serverErrors[key];
}

async function submit(): Promise<void> {
  touched.value = true;
  clearServerErrors();
  if (clientErrors.value.startDate || clientErrors.value.endDate) return;
  submitting.value = true;
  try {
    await vacationRequestsApi.create(
      { startDate: form.startDate, endDate: form.endDate, reason: form.reason },
      idempotencyKey,
    );
    idempotencyKey = crypto.randomUUID();
    toast.show('Request submitted.');
    await router.push('/requests');
  } catch (e) {
    const error = toApiError(e);
    if (error.code === 'NETWORK_ERROR') {
      // Keep the same key: resubmitting after a lost response must not create a duplicate.
      serverErrors.form = error.message;
    } else {
      idempotencyKey = crypto.randomUUID();
      const message = describeError(error);
      if (error.code === 'START_DATE_IN_PAST') serverErrors.startDate = message;
      else if (error.code === 'INVALID_DATE_RANGE' || error.code === 'VACATION_OVERLAP')
        serverErrors.endDate = message;
      else if (error.code === 'VALIDATION_FAILED') Object.assign(serverErrors, error.fieldErrors);
      else serverErrors.form = message;
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="max-w-xl">
    <h1 class="text-2xl font-semibold">New vacation request</h1>
    <p class="mb-6 text-sm text-slate-600">
      Check
      <RouterLink to="/team" class="text-indigo-700 hover:underline">team planning</RouterLink>
      before picking dates.
    </p>
    <form
      class="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      novalidate
      @submit.prevent="submit"
    >
      <div
        v-if="serverErrors.form"
        class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
        role="alert"
      >
        {{ serverErrors.form }}
      </div>
      <DateRangeFields
        v-model:start="form.startDate"
        v-model:end="form.endDate"
        :min="today"
        :start-error="shown.startDate"
        :end-error="shown.endDate"
      />
      <p v-if="summary" class="text-sm text-slate-600" aria-live="polite">{{ summary }}</p>
      <BaseTextarea
        v-model="form.reason"
        label="Reason (optional)"
        :maxlength="REASON_MAX_LENGTH"
        :error="serverErrors.reason"
      />
      <div class="flex justify-end gap-2">
        <RouterLink to="/requests"><BaseButton variant="secondary">Cancel</BaseButton></RouterLink>
        <BaseButton type="submit" :loading="submitting">Submit request</BaseButton>
      </div>
    </form>
  </section>
</template>
