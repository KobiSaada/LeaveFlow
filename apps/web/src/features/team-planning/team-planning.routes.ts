import type { RouteRecordRaw } from 'vue-router';

export const teamPlanningRoutes: RouteRecordRaw[] = [
  {
    path: '/team',
    component: () => import('./views/TeamPlanningView.vue'),
    meta: { roles: ['REQUESTER', 'VALIDATOR'], title: 'Team planning' },
  },
];
