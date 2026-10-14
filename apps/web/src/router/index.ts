import type { UserRole } from '@leaveflow/contracts';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Roles allowed on the route; absent = public. Server-side checks remain authoritative. */
    roles?: UserRole[];
    guestOnly?: boolean;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true, title: 'Sign in' },
  },
  {
    path: '/',
    redirect: () => useAuthStore().homeRoute,
  },
  {
    path: '/requests',
    component: () => import('@/views/MyRequestsView.vue'),
    meta: { roles: ['REQUESTER'], title: 'My requests' },
  },
  {
    path: '/requests/new',
    component: () => import('@/views/NewRequestView.vue'),
    meta: { roles: ['REQUESTER'], title: 'New request' },
  },
  {
    path: '/team',
    component: () => import('@/views/TeamPlanningView.vue'),
    meta: { roles: ['REQUESTER', 'VALIDATOR'], title: 'Team planning' },
  },
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { roles: ['VALIDATOR'], title: 'Requests dashboard' },
  },
  {
    path: '/forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: 'Access denied' },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not found' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.guestOnly && auth.isAuthenticated) return auth.homeRoute;
  if (to.meta.roles) {
    if (!auth.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } };
    if (!auth.role || !to.meta.roles.includes(auth.role)) return '/forbidden';
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · LeaveFlow` : 'LeaveFlow';
});
