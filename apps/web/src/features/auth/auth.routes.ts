import type { RouteRecordRaw } from 'vue-router';

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('./views/LoginView.vue'),
    meta: { guestOnly: true, title: 'Sign in' },
  },
];
