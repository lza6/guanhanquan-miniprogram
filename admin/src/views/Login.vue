<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <h2 class="brand">管焊圈 · 运营后台</h2>
      <el-form :model="form" @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="管理员账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          登录
        </el-button>
      </el-form>
      <p class="hint">首次部署：账号 admin，密码取云函数环境变量 ADMIN_INIT_PASSWORD</p>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '' })

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await api.login(form)
    localStorage.setItem('ghq_admin_token', data.token)
    localStorage.setItem('ghq_admin_name', data.username)
    ElMessage.success('登录成功')
    router.push('/overview')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2d3d 0%, #2b4a6f 100%);
}
.login-card { width: 380px; padding: 8px 12px 4px; }
.brand { text-align: center; margin: 8px 0 24px; color: #1f2d3d; }
.hint { color: #909399; font-size: 12px; margin: 12px 0 0; line-height: 1.6; }
</style>