<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();
const withShell = computed(() => auth.isAuthenticated && !route.meta.guestOnly);
</script>

<template>
  <AppShell v-if="withShell"><RouterView /></AppShell>
  <RouterView v-else />
  <ToastHost />
</template>
