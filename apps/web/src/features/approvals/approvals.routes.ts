import type { RouteRecordRaw } from 'vue-router';

export const approvalsRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('./views/DashboardView.vue'),
    meta: { roles: ['VALIDATOR'], title: 'Requests dashboard' },
  },
];
