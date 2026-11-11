<template>
  <div class="page-card">
    <h3 class="page-title">举报处理</h3>
    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px" @change="load">
          <el-option label="待处理" :value="0" />
          <el-option label="处理中" :value="1" />
          <el-option label="已处理" :value="2" />
          <el-option label="已驳回" :value="3" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="jobId" label="关联岗位" width="140" />
      <el-table-column prop="bossPhone" label="被举报号码" width="140" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">{{ typeText(row.reportType) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="举报原因" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="{ 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }[row.status]">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="open(row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />

    <el-dialog v-model="visible" title="处理举报" width="440px">
      <el-form label-width="80px">
        <el-form-item label="结果">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="处理中" :value="1" />
            <el-option label="已处理（属实）" :value="2" />
            <el-option label="已驳回" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">提交</el-button>
      </template>
    </el-dialog>
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
const visible = ref(false)
const form = reactive({ id: '', status: 2, remark: '' })

const typeText = (t) => ({ 1: '虚假信息', 2: '重复信息', 3: '违法信息', 4: '骚扰/诈骗', 5: '其他', 6: '黑名单申诉' }[t] || '其他')
const statusText = (s) => ({ 0: '待处理', 1: '处理中', 2: '已处理', 3: '已驳回' }[s] || '未知')
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

async function load() {
  loading.value = true
  try {
    const data = await api.reports(query)
    rows.value = data.records
    total.value = data.total
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function open(row) {
  form.id = row.id
  form.status = 2
  form.remark = ''
  visible.value = true
}

async function submit() {
  try {
    await api.handleReport(form.id, { status: form.status, remark: form.remark })
    visible.value = false
    ElMessage.success('已提交')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>