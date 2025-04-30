import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/main.css";
import router from "@/router/router"

console.log("[Timeline] Initializing Vue application");
const app = createApp(App);
const pinia = createPinia();

console.log("[Timeline] Setting up router and store");
app.use(router)
app.use(pinia);

console.log("[Timeline] Mounting application");
app.mount("#app");
