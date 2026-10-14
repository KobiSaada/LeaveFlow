import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { configureHttp } from './api/http';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { useToast } from './composables/useToast';
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
