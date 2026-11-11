<template>
  <cu-custom :bgColor="bgColor" :isBack="showBack">
    <block slot="content">{{ title }}</block>
    <slot name="right" slot="right"></slot>
  </cu-custom>
</template>

<script>
export default {
  name: 'nav-bar',
  props: {
    title: { type: String, default: '' },
    showBack: { type: [Boolean, String], default: false },
    bgColor: { type: String, default: 'bg-gradual-green' }
  }
}
</script>
