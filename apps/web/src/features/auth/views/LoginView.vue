<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toApiError } from '@/shared/api/http';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import BaseInput from '@/shared/components/ui/BaseInput.vue';
import { useAuthStore } from '@/features/auth/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

const demoAccounts = [
  { email: 'alice@leaveflow.dev', who: 'Alice Cohen — Requester' },
  { email: 'bob@leaveflow.dev', who: 'Bob Levi — Requester' },
  { email: 'dana@leaveflow.dev', who: 'Dana Mizrahi — Validator' },
  { email: 'yossi@leaveflow.dev', who: 'Yossi Ben-David — Validator' },
];

function useDemo(account: string): void {
  email.value = account;
  password.value = 'LeaveFlow!2026';
}

async function submit(): Promise<void> {
  error.value = '';
  submitting.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : auth.homeRoute;
    await router.replace(redirect);
  } catch (e) {
    const apiError = toApiError(e);
    // One message for every credential failure, mirroring the API (no account enumeration).
    error.value =
      apiError.status === 401 || apiError.status === 422
        ? 'Invalid email or password.'
        : apiError.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <img src="/favicon.svg" alt="" class="mx-auto size-12" />
        <h1 class="mt-3 text-2xl font-semibold">Sign in to LeaveFlow</h1>
        <p class="mt-1 text-sm text-slate-600">Request, review and plan vacations.</p>
      </div>
      <form
        class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        novalidate
        @submit.prevent="submit"
      >
        <div
          v-if="error"
          class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {{ error }}
        </div>
        <BaseInput v-model="email" label="Email" type="email" autocomplete="username" required />
        <BaseInput
          v-model="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          required
        />
        <BaseButton type="submit" class="w-full" :loading="submitting">Sign in</BaseButton>
      </form>
      <details class="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <summary class="cursor-pointer font-medium text-slate-700">Demo accounts</summary>
        <p class="mt-2 text-slate-500">
          Password for all: <code class="rounded bg-slate-100 px-1">LeaveFlow!2026</code>
        </p>
        <ul class="mt-2 space-y-1">
          <li v-for="account in demoAccounts" :key="account.email">
            <button
              type="button"
              class="text-left text-indigo-700 hover:underline"
              @click="useDemo(account.email)"
            >
              {{ account.who }}
            </button>
          </li>
        </ul>
      </details>
    </div>
  </main>
</template>
