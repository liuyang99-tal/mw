<script setup lang="ts">
const version = '1.4.4'; // 从 package.json 获取的版本号
</script>

<template>
  <div class="version-info">
    Timeline Version: {{ version }}
  </div>
</template>

<style scoped>
.version-info {
  position: fixed;
  bottom: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  z-index: 1000;
}
</style> 