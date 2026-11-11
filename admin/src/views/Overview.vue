<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">注册用户</div><div class="value">{{ d.users }}</div></div>
      <div class="stat-card success"><div class="label">在招岗位</div><div class="value">{{ d.jobs.online }}</div></div>
      <div class="stat-card warn"><div class="label">待审核岗位</div><div class="value">{{ d.jobs.pending }}</div></div>
      <div class="stat-card danger"><div class="label">待处理黑名单</div><div class="value">{{ d.blacklistPending }}</div></div>
      <div class="stat-card danger"><div class="label">待处理举报</div><div class="value">{{ d.reportsPending }}</div></div>
      <div class="stat-card"><div class="label">报名总数</div><div class="value">{{ d.applications }}</div></div>
      <div class="stat-card success"><div class="label">今日活跃</div><div class="value">{{ d.activeToday }}</div></div>
      <div class="stat-card success"><div class="label">月活（30 天）</div><div class="value">{{ d.mau }}</div></div>
      <div class="stat-card"><div class="label">本周新增岗位</div><div class="value">{{ d.weekJobs }}</div></div>
      <div class="stat-card"><div class="label">本月新增岗位</div><div class="value">{{ d.monthJobs }}</div></div>
      <div class="stat-card"><div class="label">本月新增用户</div><div class="value">{{ d.monthUsers }}</div></div>
      <div class="stat-card warn"><div class="label">待审实名/企业</div><div class="value">{{ d.realNamePending }} / {{ d.enterprisePending }}</div></div>
      <div class="stat-card warn"><div class="label">待审简历</div><div class="value">{{ d.resumePending }}</div></div>
      <div class="stat-card warn"><div class="label">待处理反馈</div><div class="value">{{ d.pendingFeedback }}</div></div>
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

    <div class="page-card" style="margin-top: 16px">
      <h3 class="page-title">近 7 日新增</h3>
      <div class="trend">
        <div class="trend-col" v-for="d in trend" :key="d.day">
          <div class="bars">
            <i class="bar-u" :style="{ height: h(d.users, 'users') }"></i>
            <i class="bar-j" :style="{ height: h(d.jobs, 'jobs') }"></i>
          </div>
          <div class="trend-day">{{ d.day }}</div>
        </div>
      </div>
      <div class="legend"><span class="dot u"></span>用户 <span class="dot j"></span>岗位</div>
    </div>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <div class="page-card">
          <h3 class="page-title">工种分布</h3>
          <div class="bar-row" v-for="it in d.byCategory" :key="it.name">
            <span class="bar-name">{{ it.name }}</span>
            <span class="bar"><i :style="{ width: barWidth(it.count, d.byCategory) }"></i></span>
            <span class="bar-num">{{ it.count }}</span>
          </div>
          <div v-if="!d.byCategory.length" class="empty">暂无数据</div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <h3 class="page-title">地区分布</h3>
          <div class="bar-row" v-for="it in d.byRegion" :key="it.name">
            <span class="bar-name">{{ it.name }}</span>
            <span class="bar"><i :style="{ width: barWidth(it.count, d.byRegion) }"></i></span>
            <span class="bar-num">{{ it.count }}</span>
          </div>
          <div v-if="!d.byRegion.length" class="empty">暂无数据</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const d = reactive({
  byCategory: [], byRegion: [], trend7d: [], activeToday: 0, mau: 0, weekJobs: 0, monthJobs: 0, monthUsers: 0,
  realNamePending: 0, enterprisePending: 0, resumePending: 0, pendingFeedback: 0,
  users: 0, applications: 0, blacklistPending: 0, reportsPending: 0,
  jobs: { total: 0, pending: 0, online: 0, expired: 0, rejected: 0 },
  today: { newUsers: 0, newJobs: 0 }
})

const trend = computed(() => d.trend7d || [])
function h(n, key) {
  const max = Math.max(1, ...(d.trend7d || []).map((x) => x[key]))
  return Math.max(4, Math.round((n / max) * 100)) + 'px'
}

function barWidth(n, list) {
  const max = Math.max(1, ...list.map((x) => x.count))
  return Math.round((n / max) * 100) + '%'
}

onMounted(async () => {
  try {
    Object.assign(d, await api.overview())
  } catch (e) {
    ElMessage.error(e.message)
  }
})
</script>

<style scoped>
.bar-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 13px; }
.bar-name { width: 90px; color: #606266; }
.bar { flex: 1; height: 10px; background: #f0f2f5; border-radius: 5px; margin: 0 8px; }
.bar i { display: block; height: 10px; background: #409eff; border-radius: 5px; }
.bar-num { width: 30px; text-align: right; color: #909399; }
.empty { color: #c0c4cc; font-size: 13px; }
.trend { display: flex; align-items: flex-end; gap: 18px; height: 120px; margin-top: 8px; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bars { display: flex; align-items: flex-end; gap: 4px; height: 90px; }
.bar-u { width: 12px; background: #409eff; border-radius: 3px 3px 0 0; }
.bar-j { width: 12px; background: #67c23a; border-radius: 3px 3px 0 0; }
.trend-day { font-size: 12px; color: #909399; margin-top: 6px; }
.legend { font-size: 12px; color: #909399; margin-top: 6px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin: 0 4px 0 10px; }
.dot.u { background: #409eff; } .dot.j { background: #67c23a; }
</style>