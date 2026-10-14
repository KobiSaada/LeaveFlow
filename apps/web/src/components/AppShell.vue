<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const links = computed(() =>
  auth.role === 'VALIDATOR'
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/team', label: 'Team planning' },
      ]
    : [
        { to: '/requests', label: 'My requests' },
        { to: '/requests/new', label: 'New request' },
        { to: '/team', label: 'Team planning' },
      ],
);

function signOut(): void {
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <RouterLink
          :to="auth.homeRoute"
          class="flex items-center gap-2 font-semibold text-indigo-700"
        >
          <img src="/favicon.svg" alt="" class="size-7" /> LeaveFlow
        </RouterLink>
        <div class="flex items-center gap-3 text-sm">
          <span class="hidden text-slate-600 sm:inline">
            {{ auth.user?.name }} ·
            <span class="font-medium">{{
              auth.role === 'VALIDATOR' ? 'Validator' : 'Requester'
            }}</span>
          </span>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            @click="signOut"
          >
            Sign out
          </button>
        </div>
        <nav class="-mb-3 flex w-full gap-1 overflow-x-auto" aria-label="Main">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-slate-600 hover:text-slate-900"
            exact-active-class="!border-indigo-600 font-medium text-slate-900"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
