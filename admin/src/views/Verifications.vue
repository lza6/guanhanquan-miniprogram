<template>
  <div class="page-card">
    <h3 class="page-title">认证审核</h3>
    <p class="notice">实名认证用于确认身份；企业认证通过后，该雇主发布的岗位会展示“已认证”标识。</p>

    <el-form inline>
      <el-form-item label="类型">
        <el-radio-group v-model="query.type" @change="load">
          <el-radio-button label="real">实名认证</el-radio-button>
          <el-radio-button label="enterprise">企业认证</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 140px" @change="load">
          <el-option label="待审核" :value="0" />
          <el-option label="已通过" :value="1" />
          <el-option label="已驳回" :value="2" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <template v-if="query.type === 'real'">
        <el-table-column prop="realName" label="真实姓名" width="110" />
        <el-table-column prop="idCardMasked" label="身份证号" min-width="180" />
      </template>
      <template v-else>
        <el-table-column label="企业名称" min-width="180">
          <template #default="{ row }">{{ row.enterprise && row.enterprise.companyName }}</template>
        </el-table-column>
        <el-table-column label="信用代码" width="180">
          <template #default="{ row }">{{ row.enterprise && row.enterprise.creditCode }}</template>
        </el-table-column>
        <el-table-column label="营业执照" width="110">
          <template #default="{ row }">
            <el-image v-if="row.enterprise && row.enterprise.license"
              :src="row.enterprise.license" :preview-src-list="[row.enterprise.license]"
              style="width: 60px; height: 40px" fit="cover" />
            <span v-else class="muted">未上传</span>
          </template>
        </el-table-column>
      </template>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="{ 0: 'warning', 1: 'success', 2: 'danger' }[row.status]">
            {{ ['待审核', '已通过', '已驳回'][row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 0">
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
const query = reactive({ type: 'real', status: 0, page: 1, pageSize: 20 })
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.verifications(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function review(row, pass) {
  await ElMessageBox.confirm(pass ? '确认该认证资料真实有效？' : '确认驳回？', '提示', { type: 'warning' })
  try {
    await api.reviewVerification(row.id, { type: query.type, pass })
    ElMessage.success('已处理')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reject(row) {
  const { value } = await ElMessageBox.prompt('填写驳回原因，会通知用户', '驳回认证', {
    inputPlaceholder: '例如：身份证照片与姓名不一致',
    inputValidator: (v) => (v && v.trim().length >= 2) || '请填写原因'
  })
  try {
    await api.reviewVerification(row.id, { type: query.type, pass: false, reason: value })
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
.muted { color: #c0c4cc; font-size: 12px; }
.reason { color: #f56c6c; font-size: 12px; }
</style>