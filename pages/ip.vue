<script setup>
const { data } = await useFetch('/api/country', { server: false })
</script>

<template>
  <div>
    <h1>Country: {{ data }}</h1>
  </div>
</template>