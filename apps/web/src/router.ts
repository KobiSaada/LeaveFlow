import type { UserRole } from '@leaveflow/contracts';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { approvalsRoutes } from '@/features/approvals/approvals.routes';
import { authRoutes } from '@/features/auth/auth.routes';
import { useAuthStore } from '@/features/auth/auth.store';
import { myRequestsRoutes } from '@/features/my-requests/my-requests.routes';
import { teamPlanningRoutes } from '@/features/team-planning/team-planning.routes';

declare module 'vue-router' {
  interface RouteMeta {
    /** Roles allowed on the route; absent = public. Server-side checks remain authoritative. */
    roles?: UserRole[];
    guestOnly?: boolean;
    title?: string;
  }
}

/** Each feature declares its own routes; the app composes them and adds the shared pages. */
const routes: RouteRecordRaw[] = [
  ...authRoutes,
  ...myRequestsRoutes,
  ...approvalsRoutes,
  ...teamPlanningRoutes,
  { path: '/', redirect: () => useAuthStore().homeRoute },
  {
    path: '/forbidden',
    component: () => import('@/shared/views/ForbiddenView.vue'),
    meta: { title: 'Access denied' },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/shared/views/NotFoundView.vue'),
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
  auth.dropExpiredSession();
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
