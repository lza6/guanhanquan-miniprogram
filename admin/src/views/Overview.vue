<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">注册用户</div><div class="value">{{ d.users }}</div></div>
      <div class="stat-card success"><div class="label">在招岗位</div><div class="value">{{ d.jobs.online }}</div></div>
      <div class="stat-card warn"><div class="label">待审核岗位</div><div class="value">{{ d.jobs.pending }}</div></div>
      <div class="stat-card danger"><div class="label">待处理黑名单</div><div class="value">{{ d.blacklistPending }}</div></div>
      <div class="stat-card danger"><div class="label">待处理举报</div><div class="value">{{ d.reportsPending }}</div></div>
      <div class="stat-card"><div class="label">报名总数</div><div class="value">{{ d.applications }}</div></div>
    </div>

    <div class="page-card" style="margin-top: 16px">
      <h3 class="page-title">今日新增</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="新增用户">{{ d.today.newUsers }}</el-descriptions-item>
        <el-descriptions-item label="新增岗位">{{ d.today.newJobs }}</el-descriptions-item>
        <el-descriptions-item label="岗位总数">{{ d.jobs.total }}</el-descriptions-item>
        <el-descriptions-item label="驳回岗位">{{ d.jobs.rejected }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const d = reactive({
  users: 0, applications: 0, blacklistPending: 0, reportsPending: 0,
  jobs: { total: 0, pending: 0, online: 0, rejected: 0 },
  today: { newUsers: 0, newJobs: 0 }
})

onMounted(async () => {
  try {
    Object.assign(d, await api.overview())
  } catch (e) {
    ElMessage.error(e.message)
  }
})
</script>