<template>
  <div class="page-card">
    <h3 class="page-title">黑老板库审核</h3>
    <p class="notice">只有「已确认」的标记才会对外展示；确认前请核对证据与描述，必要时联系举报人。</p>

    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px" @change="load">
          <el-option label="待审核" :value="0" />
          <el-option label="已确认" :value="1" />
          <el-option label="已拒绝" :value="2" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="bossPhone" label="老板手机号" width="140" />
      <el-table-column prop="bossName" label="称呼" width="100" />
      <el-table-column label="原因" width="150">
        <template #default="{ row }">{{ reasonText(row.reasonType) }}</template>
      </el-table-column>
      <el-table-column prop="reasonDetail" label="情况说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="证据" width="90">
        <template #default="{ row }">{{ (row.evidence || []).length }} 张</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="{ 0: 'warning', 1: 'danger', 2: 'info' }[row.status]">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 0">
            <el-button size="small" type="danger" @click="review(row, true)">确认</el-button>
            <el-button size="small" @click="review(row, false)">拒绝</el-button>
          </template>
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
const query = reactive({ status: 0, page: 1, pageSize: 20 })

const reasonText = (t) => ({ 1: '欠薪/拖薪', 2: '放鸽子', 3: '虚假信息', 4: '态度恶劣/克扣', 5: '其他' }[t] || '其他')
const statusText = (s) => ({ 0: '待审核', 1: '已确认', 2: '已拒绝' }[s] || '未知')
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.blacklist(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function review(row, pass) {
  await ElMessageBox.confirm(pass ? '确认该举报属实？确认后将对外展示' : '拒绝该举报？', '提示', { type: 'warning' })
  try {
    await api.reviewBlacklist(row.id, pass)
    ElMessage.success('已处理')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.notice { color: #909399; font-size: 13px; margin: 0 0 12px; }
</style>