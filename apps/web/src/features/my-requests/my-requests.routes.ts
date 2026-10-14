import type { RouteRecordRaw } from 'vue-router';

export const myRequestsRoutes: RouteRecordRaw[] = [
  {
    path: '/requests',
    component: () => import('./views/MyRequestsView.vue'),
    meta: { roles: ['REQUESTER'], title: 'My requests' },
  },
  {
    path: '/requests/new',
    component: () => import('./views/NewRequestView.vue'),
    meta: { roles: ['REQUESTER'], title: 'New request' },
  },
];
