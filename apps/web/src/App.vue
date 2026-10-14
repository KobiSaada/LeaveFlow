<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/shared/components/AppShell.vue';
import ToastHost from '@/shared/components/ui/ToastHost.vue';
import { useAuthStore } from '@/features/auth/auth.store';

const route = useRoute();
const auth = useAuthStore();
const withShell = computed(() => auth.isAuthenticated && !route.meta.guestOnly);
</script>

<template>
  <AppShell v-if="withShell"><RouterView /></AppShell>
  <RouterView v-else />
  <ToastHost />
</template>
