<template>
  <div class="page-card">
    <h3 class="page-title">简历审核</h3>
    <p class="notice">审核通过后，简历才会出现在工人简历库和分类工人列表；驳回原因会通知本人。</p>

    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 140px" @change="load">
          <el-option label="待审核" :value="0" />
          <el-option label="已通过" :value="1" />
          <el-option label="已驳回" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="姓名" clearable style="width: 180px" @keyup.enter="load" />
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="name" label="姓名" width="110" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="工种" width="150">
        <template #default="{ row }">{{ (row.jobTypes || []).join(' / ') }}</template>
      </el-table-column>
      <el-table-column prop="certificateInfo" label="证书" width="110" />
      <el-table-column prop="workExperience" label="年限" width="90" />
      <el-table-column prop="expectArea" label="期望地区" width="130" />
      <el-table-column prop="techDescription" label="技术描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="{ 0: 'warning', 1: 'success', 2: 'danger' }[row.reviewStatus]">
            {{ ['待审核', '已通过', '已驳回'][row.reviewStatus] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.reviewStatus === 0">
            <el-button size="small" type="success" @click="review(row, true)">通过</el-button>
            <el-button size="small" type="danger" @click="reject(row)">驳回</el-button>
          </template>
          <span v-else-if="row.rejectReason" class="reason">{{ row.rejectReason }}</span>
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
const query = reactive({ status: 0, keyword: '', page: 1, pageSize: 20 })
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.resumes(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function review(row, pass) {
  await ElMessageBox.confirm(pass ? '确认该简历内容真实完整？' : '确认驳回？', '提示', { type: 'warning' })
  try {
    await api.reviewResume(row.id, { pass })
    ElMessage.success('已处理')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reject(row) {
  const { value } = await ElMessageBox.prompt('填写驳回原因，会通知求职者', '驳回简历', {
    inputPlaceholder: '例如：联系方式无效 / 技术描述过于简单',
    inputValidator: (v) => (v && v.trim().length >= 2) || '请填写原因'
  })
  try {
    await api.reviewResume(row.id, { pass: false, reason: value })
    ElMessage.success('已驳回')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.notice { color: #909399; font-size: 13px; margin: 0 0 14px; }
.reason { color: #f56c6c; font-size: 12px; }
</style>