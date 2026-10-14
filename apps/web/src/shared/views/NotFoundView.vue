<script setup lang="ts">
import { Compass, House } from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/auth.store';

const auth = useAuthStore();
</script>

<template>
  <section class="mx-auto max-w-md py-16 text-center">
    <span
      class="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"
      aria-hidden="true"
    >
      <Compass class="size-7" />
    </span>
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <p class="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
    <RouterLink
      :to="auth.isAuthenticated ? auth.homeRoute : '/login'"
      class="mt-6 inline-flex items-center gap-1.5 font-medium text-indigo-700 hover:underline"
    >
      <House class="size-4" aria-hidden="true" />Go to your home page
    </RouterLink>
  </section>
</template>
