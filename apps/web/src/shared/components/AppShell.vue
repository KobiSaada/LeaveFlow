<script setup lang="ts">
import { CalendarPlus, LayoutDashboard, ListChecks, LogOut, UsersRound } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/auth.store';
import UserAvatar from './ui/UserAvatar.vue';

const auth = useAuthStore();
const router = useRouter();

const links = computed(() =>
  auth.role === 'VALIDATOR'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/team', label: 'Team planning', icon: UsersRound },
      ]
    : [
        { to: '/requests', label: 'My requests', icon: ListChecks },
        { to: '/requests/new', label: 'New request', icon: CalendarPlus },
        { to: '/team', label: 'Team planning', icon: UsersRound },
      ],
);

function signOut(): void {
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <RouterLink
          :to="auth.homeRoute"
          class="flex items-center gap-2 font-semibold text-slate-900"
        >
          <img src="/favicon.svg" alt="" class="size-8 rounded-lg" />
          <span>Leave<span class="text-indigo-600">Flow</span></span>
        </RouterLink>
        <div class="flex items-center gap-2">
          <div
            v-if="auth.user"
            class="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 sm:bg-slate-100"
          >
            <UserAvatar :name="auth.user.name" size="sm" />
            <span class="hidden leading-tight sm:block">
              <span class="block text-sm font-medium text-slate-800">{{ auth.user.name }}</span>
              <span
                class="block text-[11px] font-medium"
                :class="auth.role === 'VALIDATOR' ? 'text-violet-600' : 'text-indigo-600'"
              >
                {{ auth.role === 'VALIDATOR' ? 'Validator' : 'Requester' }}
              </span>
            </span>
          </div>
          <button
            type="button"
            class="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Sign out"
            title="Sign out"
            @click="signOut"
          >
            <LogOut class="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Main">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm whitespace-nowrap text-slate-500 transition-colors hover:text-slate-900"
          exact-active-class="!border-indigo-600 font-medium !text-indigo-700"
        >
          <component :is="link.icon" class="size-4" aria-hidden="true" />
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
