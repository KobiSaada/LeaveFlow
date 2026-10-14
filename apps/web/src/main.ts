import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { configureHttp } from './shared/api/http';
import { router } from './router';
import { useAuthStore } from './features/auth/auth.store';
import { useToast } from './shared/composables/useToast';
import './style.css';

const app = createApp(App);
app.use(createPinia());

const auth = useAuthStore();
configureHttp({
  getToken: () => auth.token,
  onUnauthorized: () => {
    auth.logout();
    useToast().show('Your session has expired. Please sign in again.', 'info');
    void router.replace({
      path: '/login',
      query: { redirect: router.currentRoute.value.fullPath },
    });
  },
});

app.use(router);
app.mount('#app');
