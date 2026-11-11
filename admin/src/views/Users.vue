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
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="userType" label="身份" width="90">
        <template #default="{ row }">{{ row.userType === 'employer' ? '招工方' : '工人' }}</template>
      </el-table-column>
      <el-table-column label="认证" width="160">
        <template #default="{ row }">
          <el-tag size="small" :type="row.realNameStatus === 1 ? 'success' : (row.realNameStatus === 0 ? 'warning' : 'info')">
            实名{{ ['待审', '已过', '驳回'][row.realNameStatus] || '未提交' }}
          </el-tag>
          <el-tag size="small" style="margin-left: 6px" :type="row.enterpriseStatus === 1 ? 'success' : (row.enterpriseStatus === 0 ? 'warning' : 'info')">
            企业{{ ['待审', '已过', '驳回'][row.enterpriseStatus] || '未提交' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="80" />
      <el-table-column prop="balance" label="余额" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'danger' : 'success'">{{ row.status === 1 ? '已封禁' : '正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">详情</el-button>
          <el-button size="small" :type="row.status === 1 ? 'success' : 'danger'" @click="toggle(row)">
            {{ row.status === 1 ? '解封' : '封禁' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />

    <el-drawer v-model="detailVisible" title="用户详情" size="420px">
      <div v-if="detail" class="detail">
        <p><b>昵称：</b>{{ detail.nickname }}（{{ detail.userType === 'employer' ? '招工方' : '工人' }}）</p>
        <p><b>手机号：</b>{{ detail.phone }}</p>
        <p><b>积分 / 余额：</b>{{ detail.points }} / ¥{{ detail.balance }}</p>
        <p><b>实名：</b>{{ detail.realName || '未提交' }} {{ detail.idCardMasked }}</p>
        <p><b>企业：</b>{{ detail.enterprise && detail.enterprise.companyName || '未提交' }}</p>
        <p><b>注册 / 最近活跃：</b>{{ fmt(detail.createdAt) }} / {{ fmt(detail.lastLoginAt) }}</p>
        <p><b>发布岗位 / 报名：</b>{{ detail.counts.jobs }} / {{ detail.counts.applications }}</p>
        <h4>最近流水</h4>
        <el-table :data="detail.wallet" size="small" border>
          <el-table-column prop="businessType" label="业务" width="110" />
          <el-table-column prop="amount" label="变动" width="80" />
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>
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
const detailVisible = ref(false)
const detail = ref(null)
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

async function openDetail(row) {
  try {
    detail.value = await api.userDetail(row.id)
    detailVisible.value = true
  } catch (e) {
    ElMessage.error(e.message)
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

<style scoped>
.detail p { margin: 6px 0; color: #606266; font-size: 13px; }
.detail h4 { margin: 16px 0 8px; }
</style>