<template>
  <div class="page-card">
    <h3 class="page-title">客服 · 意见反馈</h3>

    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px" @change="load">
          <el-option label="待处理" :value="0" />
          <el-option label="处理中" :value="1" />
          <el-option label="已处理" :value="2" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column label="类型" width="110">
        <template #default="{ row }">{{ typeText(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
      <el-table-column prop="contact" label="联系方式" width="150" />
      <el-table-column label="凭证" width="80">
        <template #default="{ row }">{{ (row.images || []).length }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="{ 0: 'warning', 1: 'primary', 2: 'success' }[row.status]">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="handle(row, 1)">处理中</el-button>
          <el-button size="small" type="success" @click="handle(row, 2)">已处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ status: 0, page: 1, pageSize: 20 })

const typeText = (t) => ({ 1: '功能建议', 2: '问题反馈', 3: '投诉' }[t] || '其他')
const statusText = (s) => ({ 0: '待处理', 1: '处理中', 2: '已处理' }[s] || '未知')
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.feedback(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function handle(row, status) {
  try {
    await api.handleFeedback(row.id, { status })
    ElMessage.success('已更新')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>