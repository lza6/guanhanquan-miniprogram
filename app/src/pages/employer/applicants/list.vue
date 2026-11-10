<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">报名管理</block></cu-custom>

    <view class="card" v-for="j in jobs" :key="j.id">
      <view class="head" @tap="toggle(j)">
        <view>
          <text class="title">{{ j.title }}</text>
          <text class="meta">{{ j.workArea }} · {{ j.salary }} 元/天</text>
        </view>
        <text class="count">{{ j.applyCount }} 人报名</text>
      </view>

      <view v-if="expanded === j.id" class="apps">
        <view v-if="!applicants.length" class="empty">还没有人报名</view>
        <view class="app" v-for="a in applicants" :key="a.id">
          <view class="app-info">
            <text class="name">{{ a.workerName || '工友' }}</text>
            <text class="phone">{{ a.workerPhone }}</text>
            <text class="note" v-if="a.coverLetter">{{ a.coverLetter }}</text>
          </view>
          <view class="app-ops" v-if="a.status === 'pending'">
            <button class="ok" @tap="decide(j, a, true)">录用</button>
            <button class="no" @tap="decide(j, a, false)">拒绝</button>
          </view>
          <text class="done" v-else>{{ a.status === 'accepted' ? '已录用' : '已拒绝' }}</text>
        </view>
      </view>
    </view>

    <view v-if="!loading && !jobs.length" class="empty-page">还没有发布过岗位</view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() {
    return { jobs: [], applicants: [], expanded: '', loading: false }
  },
  onLoad() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await api.getEmployerJobs({ page: 1, pageSize: 50, status: 1 })
        this.jobs = (res.data && res.data.records) || []
      } catch (e) { this.jobs = [] } finally { this.loading = false }
    },
    async toggle(j) {
      if (this.expanded === j.id) { this.expanded = ''; return }
      this.expanded = j.id
      try {
        const res = await api.getApplicantsForJob(j.id)
        this.applicants = (res.data && res.data.records) || []
      } catch (e) { this.applicants = [] }
    },
    async decide(j, a, pass) {
      try {
        if (pass) await api.acceptJobApplicant(j.id, a.id)
        else await api.rejectJobApplicant(j.id, a.id)
        a.status = pass ? 'accepted' : 'rejected'
        uni.showToast({ title: pass ? '已录用' : '已拒绝', icon: 'success' })
      } catch (e) {}
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 32rpx; font-weight: 600; display: block; }
.meta { font-size: 24rpx; color: #999; }
.count { font-size: 24rpx; color: #1976d2; }
.apps { margin-top: 20rpx; border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; }
.app { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.name { font-size: 28rpx; margin-right: 16rpx; }
.phone { font-size: 26rpx; color: #1976d2; }
.note { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.ok { background: #52c41a; color: #fff; font-size: 24rpx; border-radius: 30rpx; padding: 0 20rpx; height: 56rpx; line-height: 56rpx; display: inline-block; margin-right: 12rpx; }
.no { background: #f5f5f5; color: #666; font-size: 24rpx; border-radius: 30rpx; padding: 0 20rpx; height: 56rpx; line-height: 56rpx; display: inline-block; }
.done { font-size: 24rpx; color: #999; }
.empty { font-size: 24rpx; color: #999; text-align: center; padding: 20rpx 0; }
.empty-page { text-align: center; color: #999; padding: 140rpx 0; font-size: 26rpx; }
</style>