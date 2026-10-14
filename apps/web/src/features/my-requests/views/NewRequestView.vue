<script setup lang="ts">
import { CalendarPlus, CalendarRange, Lightbulb, Send, TriangleAlert } from 'lucide-vue-next';
import PageHeader from '@/shared/components/ui/PageHeader.vue';
import { compareIsoDates, isValidIsoDate, REASON_MAX_LENGTH } from '@leaveflow/contracts';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toApiError } from '@/shared/api/http';
import { useMyRequestsStore } from '../my-requests.store';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import BaseTextarea from '@/shared/components/ui/BaseTextarea.vue';
import DateRangeFields from '@/features/my-requests/components/DateRangeFields.vue';
import { useToast } from '@/shared/composables/useToast';
import { formatDaysOff, formatVacation, todayLocal } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';

const router = useRouter();
const store = useMyRequestsStore();
const toast = useToast();
const today = todayLocal();

const form = reactive({ startDate: '', endDate: '', reason: '' });
const serverErrors = reactive<{
  startDate?: string;
  endDate?: string;
  reason?: string;
  form?: string;
}>({});
const touched = ref(false);

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
    ? `${formatVacation(form.startDate, form.endDate)} · ${formatDaysOff(form.startDate, form.endDate)}`
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
  try {
    await store.submit({ startDate: form.startDate, endDate: form.endDate, reason: form.reason });
    toast.show('Request submitted.');
    await router.push('/requests');
  } catch (e) {
    // Map the server's answer onto the form (the store already handled the idempotency key).
    const error = toApiError(e);
    const message = describeError(error);
    if (error.code === 'START_DATE_IN_PAST') serverErrors.startDate = message;
    else if (error.code === 'INVALID_DATE_RANGE' || error.code === 'VACATION_OVERLAP')
      serverErrors.endDate = message;
    else if (error.code === 'VALIDATION_FAILED') Object.assign(serverErrors, error.fieldErrors);
    else serverErrors.form = message;
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <PageHeader
      :icon="CalendarPlus"
      title="New vacation request"
      description="Pick your dates — we check the rules as you type."
    />

    <form
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      novalidate
      @submit.prevent="submit"
    >
      <div class="space-y-6 p-6 sm:p-8">
        <div
          v-if="serverErrors.form"
          class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ serverErrors.form }}
        </div>

        <div>
          <DateRangeFields
            v-model:start="form.startDate"
            v-model:end="form.endDate"
            :min="today"
            :start-error="shown.startDate"
            :end-error="shown.endDate"
          />
          <p
            v-if="summary"
            class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
            aria-live="polite"
          >
            <CalendarRange class="size-4" aria-hidden="true" />{{ summary }}
          </p>
        </div>

        <div>
          <BaseTextarea
            v-model="form.reason"
            label="Reason (optional)"
            :maxlength="REASON_MAX_LENGTH"
            :error="serverErrors.reason"
          />
        </div>

        <p class="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          <Lightbulb class="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            Check
            <RouterLink to="/team" class="font-medium text-indigo-700 hover:underline"
              >team planning</RouterLink
            >
            to avoid overlapping with colleagues.
          </span>
        </p>
      </div>
      <div
        class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8"
      >
        <RouterLink to="/requests"><BaseButton variant="secondary">Cancel</BaseButton></RouterLink>
        <BaseButton type="submit" :icon="Send" :loading="store.submitting"
          >Submit request</BaseButton
        >
      </div>
    </form>
  </section>
</template>
