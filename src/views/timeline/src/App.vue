<script setup lang="ts">
import { useMarkwhenStore } from "./Markwhen/markwhenStore";
import Timeline from "./Timeline/Timeline.vue";

console.log("[Timeline] App.vue setup started");
const markwhenStore = useMarkwhenStore();
console.log("[Timeline] Store initialized:", markwhenStore);

// 输出版本信息
console.log('Timeline Version: 1.0.4');

// 只在开发环境下添加测试数据
if (import.meta.env.DEV) {
  console.log("[Timeline] Loading test data in development mode");
  import('./dev').then(({ getTestData }) => {
    console.log("[Timeline] Test data module loaded");
    const { markwhen, app } = getTestData();
    console.log("[Timeline] Setting test data to store");
    markwhenStore.markwhen = markwhen;
    markwhenStore.app = app;
  }).catch(err => {
    console.error("[Timeline] Failed to load test data:", err);
  });
}
</script>

<template>
  <Timeline v-if="markwhenStore.markwhen"/>
</template>

<style scoped></style>
