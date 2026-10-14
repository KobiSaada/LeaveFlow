<script setup lang="ts">
import type { UserRole } from '@leaveflow/contracts';
import { CalendarCheck2, CalendarDays, LogIn, ShieldCheck, Users } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toApiError } from '@/shared/api/http';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import BaseInput from '@/shared/components/ui/BaseInput.vue';
import UserAvatar from '@/shared/components/ui/UserAvatar.vue';
import { useAuthStore } from '../auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

const DEMO_PASSWORD = 'LeaveFlow!2026';
const demoAccounts: Array<{ name: string; email: string; role: UserRole }> = [
  { name: 'Alice Cohen', email: 'alice@leaveflow.dev', role: 'REQUESTER' },
  { name: 'Bob Levi', email: 'bob@leaveflow.dev', role: 'REQUESTER' },
  { name: 'Dana Mizrahi', email: 'dana@leaveflow.dev', role: 'VALIDATOR' },
  { name: 'Yossi Ben-David', email: 'yossi@leaveflow.dev', role: 'VALIDATOR' },
];

const highlights = [
  {
    icon: CalendarDays,
    text: 'Request time off in seconds, with instant checks for overlaps and past dates.',
  },
  {
    icon: CalendarCheck2,
    text: 'Managers approve or reject with a comment — every decision is recorded.',
  },
  { icon: Users, text: 'See who is away this month before you pick your dates.' },
];

function useDemo(account: string): void {
  email.value = account;
  password.value = DEMO_PASSWORD;
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
  <main class="grid min-h-screen lg:grid-cols-2">
    <!-- Brand panel (large screens) -->
    <section
      class="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex lg:flex-col lg:justify-between"
      aria-label="About LeaveFlow"
    >
      <div
        class="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div class="relative flex items-center gap-2 text-lg font-semibold">
        <img src="/favicon.svg" alt="" class="size-9 rounded-lg ring-2 ring-white/30" /> LeaveFlow
      </div>
      <div class="relative max-w-md">
        <h2 class="text-3xl leading-tight font-semibold">
          Vacation requests, without the back-and-forth.
        </h2>
        <ul class="mt-8 space-y-5">
          <li v-for="item in highlights" :key="item.text" class="flex gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15"
              aria-hidden="true"
            >
              <component :is="item.icon" class="size-5" />
            </span>
            <span class="text-indigo-50">{{ item.text }}</span>
          </li>
        </ul>
      </div>
      <p class="relative flex items-center gap-2 text-sm text-indigo-200">
        <ShieldCheck class="size-4" aria-hidden="true" /> Role-based access · every decision audited
      </p>
    </section>

    <!-- Sign-in -->
    <section class="flex items-center justify-center px-4 py-10 sm:px-8">
      <div class="w-full max-w-sm">
        <div class="mb-8">
          <img src="/favicon.svg" alt="" class="size-11 rounded-xl lg:hidden" />
          <h1 class="mt-4 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
          <p class="mt-1 text-sm text-slate-500">Sign in to request, review and plan vacations.</p>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="submit">
          <div
            v-if="error"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
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
          <BaseButton type="submit" class="w-full" :icon="LogIn" :loading="submitting"
            >Sign in</BaseButton
          >
        </form>

        <div class="mt-8">
          <div
            class="flex items-center gap-3 text-xs font-medium tracking-wide text-slate-400 uppercase"
          >
            <span class="h-px flex-1 bg-slate-200" /> Demo accounts
            <span class="h-px flex-1 bg-slate-200" />
          </div>
          <ul class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li v-for="account in demoAccounts" :key="account.email">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm"
                @click="useDemo(account.email)"
              >
                <UserAvatar :name="account.name" size="sm" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-slate-800">{{
                    account.name
                  }}</span>
                  <span
                    class="block text-xs"
                    :class="account.role === 'VALIDATOR' ? 'text-violet-600' : 'text-indigo-600'"
                  >
                    {{ account.role === 'VALIDATOR' ? 'Validator' : 'Requester' }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
          <p class="mt-3 text-center text-xs text-slate-500">
            Password for all:
            <code class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{{
              DEMO_PASSWORD
            }}</code>
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
