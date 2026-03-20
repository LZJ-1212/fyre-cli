<template>
  <div class="home">
    <h1>欢迎使用 {% projectName %}</h1>
    <p>这是一个使用 Vue 3 和 Vite 构建的现代化应用</p>
  </div>
</template>

<script>
export default {
  name: 'HomeView'
}
</script>

<style scoped>
.home {
  padding: 20px;
  text-align: center;
}
</style>