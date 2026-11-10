<template>
  <div class="page-card">
    <h3 class="page-title">用户管理</h3>
    <el-form inline>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="昵称或手机号" clearable style="width: 220px" @keyup.enter="load" />
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="nickname" label="昵称" min-width="140" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="userType" label="身份" width="100">
        <template #default="{ row }">{{ row.userType === 'employer' ? '招工方' : '工人' }}</template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="90" />
      <el-table-column prop="balance" label="余额" width="90" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'danger' : 'success'">{{ row.status === 1 ? '已封禁' : '正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :type="row.status === 1 ? 'success' : 'danger'" @click="toggle(row)">
            {{ row.status === 1 ? '解封' : '封禁' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ keyword: '', page: 1, pageSize: 20 })
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.users(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function toggle(row) {
  const next = row.status === 1 ? 0 : 1
  await ElMessageBox.confirm(`确认${next === 1 ? '封禁' : '解封'}该用户？`, '提示', { type: 'warning' })
  try {
    await api.setUserStatus(row.id, next)
    ElMessage.success('操作成功')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>