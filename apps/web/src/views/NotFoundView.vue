<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <section class="mx-auto max-w-md py-16 text-center">
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <p class="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
    <RouterLink
      :to="auth.isAuthenticated ? auth.homeRoute : '/login'"
      class="mt-6 inline-block text-indigo-700 hover:underline"
    >
      Go to your home page
    </RouterLink>
  </section>
</template>
