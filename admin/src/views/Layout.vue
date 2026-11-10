<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">管焊圈后台</div>
      <el-menu :default-active="$route.path" router background-color="#1f2d3d" text-color="#bfcbd9" active-text-color="#409eff">
        <el-menu-item index="/overview">运营概览</el-menu-item>
        <el-menu-item index="/jobs">招工审核</el-menu-item>
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/blacklist">黑老板库</el-menu-item>
        <el-menu-item index="/reports">举报处理</el-menu-item>
        <el-menu-item index="/banners">轮播图</el-menu-item>
        <el-menu-item index="/finance">财务流水</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span>{{ $route.meta.title }}</span>
        <span class="user">
          {{ name }}
          <el-button link type="primary" @click="logout">退出</el-button>
        </span>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const name = localStorage.getItem('ghq_admin_name') || 'admin'

function logout() {
  localStorage.removeItem('ghq_admin_token')
  localStorage.removeItem('ghq_admin_name')
  router.push('/login')
}
</script>

<style scoped>
.layout { height: 100%; }
.aside { background: #1f2d3d; }
.logo { color: #fff; font-size: 16px; font-weight: 600; padding: 18px 20px; }
.aside :deep(.el-menu) { border-right: none; }
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
}
.user { font-weight: 400; color: #606266; font-size: 13px; }
</style>