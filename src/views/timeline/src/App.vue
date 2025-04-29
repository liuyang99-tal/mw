<script setup lang="ts">
import { useMarkwhenStore } from "./Markwhen/markwhenStore";
import Timeline from "./Timeline/Timeline.vue";

const markwhenStore = useMarkwhenStore();

// 输出版本信息
console.log('Timeline Version: 1.0.0');

// 只在开发环境下添加测试数据
if (import.meta.env.DEV) {
  import('./dev').then(({ getTestData }) => {
    const { markwhen, app } = getTestData();
    markwhenStore.markwhen = markwhen;
    markwhenStore.app = app;
  });
}
</script>

<template>
  <Timeline v-if="markwhenStore.markwhen"/>
</template>

<style scoped></style>
