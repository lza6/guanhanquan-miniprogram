<template>
  <view class="page">
    <nav-bar title="岗位管理" :showBack="true"></nav-bar>

    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.value"
        :class="['tab', { active: activeTab === tab.value }]"
        @tap="activeTab = tab.value">
        <text>{{ tab.label }}</text>
        <text v-if="tab.count" class="count">{{ tab.count }}</text>
      </view>
    </view>

    <view class="list">
      <view class="item" v-for="job in filteredJobs" :key="job.id">
        <view class="head" @tap="viewJob(job)">
          <text class="title">{{ job.title }}</text>
          <text :class="['status', 's' + job.status]">{{ statusText(job.status) }}</text>
        </view>
        <view class="meta">
          <text>{{ salaryText(job) }}</text>
          <text>· {{ job.workArea }}</text>
          <text v-if="job.duration">· {{ job.duration }}</text>
        </view>
        <view class="stats">
          <text>{{ job.viewCount }} 浏览</text>
          <text>{{ job.applyCount }} 报名</text>
          <text>{{ fmt(job.createdAt) }}</text>
        </view>
        <view class="actions">
          <template v-if="job.status === 1">
            <button class="btn primary" @tap="promote(job)">置顶 {{ wallet.topCost }} 分</button>
            <button class="btn" @tap="refresh(job)">刷新 {{ wallet.refreshCost }} 分</button>
            <button class="btn" @tap="pause(job)">暂停</button>
            <button class="btn" @tap="applicants(job)">报名 {{ job.applyCount }}</button>
          </template>
          <template v-else-if="job.status === 2">
            <button class="btn primary" @tap="resume(job)">恢复</button>
          </template>
          <button class="btn" @tap="edit(job)">编辑</button>
          <button class="btn danger" @tap="remove(job)">删除</button>
        </view>
        <view v-if="job.status === 4 && job.rejectReason" class="reason">驳回原因：{{ job.rejectReason }}</view>
      </view>
      <view v-if="!loading && !filteredJobs.length" class="empty">
        <text>暂无岗位</text>
        <button class="btn primary" @tap="publish">立即发布</button>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'
import { salaryText } from '@/utils/job'

const STATUS_TEXT = { 0: '待审核', 1: '招聘中', 2: '已暂停', 3: '已过期', 4: '已驳回' }

export default {
  data() {
    return {
      jobs: [],
      loading: false,
      activeTab: 'all',
      wallet: { topCost: 30, refreshCost: 5 }
    }
  },
  computed: {
    tabs() {
      const count = (s) => this.jobs.filter((j) => j.status === s).length
      return [
        { label: '全部', value: 'all', count: this.jobs.length },
        { label: '待审核', value: 0, count: count(0) },
        { label: '招聘中', value: 1, count: count(1) },
        { label: '已暂停', value: 2, count: count(2) },
        { label: '已过期', value: 3, count: count(3) },
        { label: '已驳回', value: 4, count: count(4) }
      ]
    },
    filteredJobs() {
      if (this.activeTab === 'all') return this.jobs
      return this.jobs.filter((j) => j.status === this.activeTab)
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    salaryText,
    statusText(s) { return STATUS_TEXT[s] || '未知' },
    fmt(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return (d.getMonth() + 1) + '-' + d.getDate()
    },
    async load() {
      this.loading = true
      try {
        const [res, wallet] = await Promise.all([
          api.getEmployerJobs({ page: 1, pageSize: 50 }),
          api.getWallet().catch(() => null)
        ])
        this.jobs = (res.data && res.data.records) || []
        if (wallet && wallet.data) {
          this.wallet = {
            topCost: wallet.data.topCost || 30,
            refreshCost: wallet.data.refreshCost || 5
          }
        }
      } catch (e) {
        this.jobs = []
      } finally {
        this.loading = false
      }
    },
    viewJob(job) {
      uni.navigateTo({ url: '/pages/jobDetail/jobDetail?id=' + job.id })
    },
    applicants(job) {
      uni.navigateTo({ url: '/pages/employer/applicants/list?jobId=' + job.id })
    },
    edit(job) {
      uni.navigateTo({ url: '/pages/employer/jobPost?id=' + job.id })
    },
    publish() {
      uni.navigateTo({ url: '/pages/employer/jobPost' })
    },
    async setStatus(job, status) {
      try {
        await api.setJobStatus(job.id, status)
        uni.showToast({ title: status === 2 ? '已暂停' : '已恢复', icon: 'success' })
        this.load()
      } catch (e) {}
    },
    pause(job) {
      uni.showModal({
        title: '暂停岗位',
        content: '暂停后工人暂时看不到这条岗位，可随时恢复。',
        success: (r) => { if (r.confirm) this.setStatus(job, 2) }
      })
    },
    resume(job) {
      uni.showModal({
        title: '恢复岗位',
        content: '恢复后岗位重新展示。',
        success: (r) => { if (r.confirm) this.setStatus(job, 1) }
      })
    },
    promote(job) {
      uni.showModal({
        title: '置顶岗位',
        content: `将消耗 ${this.wallet.topCost} 积分，置顶 7 天，确认继续？`,
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.topJob(job.id)
            uni.showToast({ title: '已置顶', icon: 'success' })
            this.load()
          } catch (e) {}
        }
      })
    },
    refresh(job) {
      uni.showModal({
        title: '刷新岗位',
        content: `将消耗 ${this.wallet.refreshCost} 积分，把岗位排到更前，确认继续？`,
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.refreshJob(job.id)
            uni.showToast({ title: '已刷新', icon: 'success' })
            this.load()
          } catch (e) {}
        }
      })
    },
    remove(job) {
      uni.showModal({
        title: '删除岗位',
        content: '删除后工人不可见，历史报名保留。确认删除？',
        confirmColor: '#e54d42',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.deleteJob(job.id)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.load()
          } catch (e) {}
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.tabs { display: flex; flex-wrap: wrap; background: #fff; padding: 12rpx 20rpx; }
.tab { padding: 10rpx 18rpx; margin-right: 12rpx; border-radius: 30rpx; background: #f5f6f8; font-size: 24rpx; color: #666; }
.tab.active { background: #1976d2; color: #fff; }
.count { margin-left: 6rpx; }
.list { padding: 20rpx; }
.item { background: #fff; border-radius: 16rpx; padding: 26rpx; margin-bottom: 20rpx; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 32rpx; font-weight: 600; }
.status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.s0 { background: #fff7e6; color: #fa8c16; }
.s1 { background: #f6ffed; color: #52c41a; }
.s2 { background: #f5f5f5; color: #999; }
.s3 { background: #f0f0f0; color: #999; }
.s4 { background: #fff1f0; color: #e54d42; }
.meta { margin-top: 12rpx; font-size: 26rpx; color: #666; }
.meta text { margin-right: 10rpx; }
.stats { margin-top: 10rpx; display: flex; gap: 24rpx; font-size: 22rpx; color: #999; }
.actions { display: flex; flex-wrap: wrap; margin-top: 18rpx; }
.btn { margin: 0 12rpx 12rpx 0; font-size: 24rpx; padding: 0 20rpx; height: 58rpx; line-height: 58rpx; border-radius: 30rpx; background: #f5f6f8; color: #333; }
.btn::after { border: none; }
.btn.primary { background: #1976d2; color: #fff; }
.btn.danger { background: #fff1f0; color: #e54d42; }
.reason { margin-top: 8rpx; font-size: 22rpx; color: #e54d42; }
.empty { text-align: center; color: #999; padding: 120rpx 0; font-size: 26rpx; }
.empty .btn { display: inline-block; margin-top: 20rpx; }
</style>