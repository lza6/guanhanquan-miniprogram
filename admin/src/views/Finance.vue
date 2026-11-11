<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card success"><div class="label">累计充值</div><div class="value">¥{{ data.rechargeTotal }}</div></div>
      <div class="stat-card"><div class="label">已支付订单</div><div class="value">{{ data.paidOrderCount }}</div></div>
      <div class="stat-card warn"><div class="label">累计消耗积分</div><div class="value">{{ data.pointsConsumed }}</div></div>
      <div class="stat-card warn"><div class="label">累计消耗余额</div><div class="value">¥{{ data.balanceConsumed }}</div></div>
      <div class="stat-card"><div class="label">流水总数</div><div class="value">{{ data.total }}</div></div>
    </div>

    <div class="page-card" style="margin-top: 16px">
      <h3 class="page-title">按业务汇总</h3>
      <div class="bar-row" v-for="it in data.byBusiness" :key="it.name">
        <span class="bar-name">{{ it.name }}</span>
        <span class="bar"><i :style="{ width: barWidth(it.amount) }"></i></span>
        <span class="bar-num">{{ it.amount }}</span>
      </div>
      <div v-if="!data.byBusiness.length" class="empty">暂无消耗</div>
    </div>

    <div class="page-card" style="margin-top: 16px">
      <h3 class="page-title">积分与余额流水</h3>
      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.amount > 0 ? 'success' : 'warning'">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="businessType" label="业务" width="140" />
        <el-table-column prop="amount" label="变动" width="100" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" :total="data.total"
        layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const rows = ref([])
const loading = ref(false)
const data = reactive({ rechargeTotal: 0, paidOrderCount: 0, pointsConsumed: 0, balanceConsumed: 0, byBusiness: [], total: 0 })
const query = reactive({ page: 1, pageSize: 20 })

const typeText = (t) => ({ 1: '积分增加', 2: '积分消耗', 3: '余额充值', 4: '余额消费' }[t] || '其他')
const fmt = (ts) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')
function barWidth(n) {
  const max = Math.max(1, ...data.byBusiness.map((x) => x.amount))
  return Math.round((n / max) * 100) + '%'
}

async function load() {
  loading.value = true
  try {
    const res = await api.finance(query)
    rows.value = res.records
    Object.assign(data, {
      rechargeTotal: res.rechargeTotal,
      paidOrderCount: res.paidOrderCount,
      pointsConsumed: res.pointsConsumed,
      balanceConsumed: res.balanceConsumed,
      byBusiness: res.byBusiness || [],
      total: res.total
    })
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>