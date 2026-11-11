<template>
  <view class="job-card" @click="goToDetail">
    <view class="job-header">
      <view class="title-wrap">
        <text class="job-title">{{ job.title }}</text>
        <text v-if="job.isTop" class="badge top">置顶</text>
        <text v-if="job.isUrgent" class="badge urgent">急招</text>
      </view>
      <text class="job-salary">{{ salaryText(job) }}</text>
    </view>

    <view class="job-meta">
      <text class="meta-item">{{ job.workArea }}</text>
      <text v-if="job.duration" class="meta-item">{{ job.duration }}</text>
      <text v-if="job.distance !== undefined && job.distance !== null" class="meta-item distance">{{ job.distance }} km</text>
    </view>

    <view class="job-footer">
      <text v-if="job.employerName" class="company">{{ job.employerName }}</text>
      <text v-if="job.employerVerified" class="verified">已认证</text>
      <text v-if="job.createdAt" class="time">{{ formatTime(job.createdAt) }}</text>
    </view>
  </view>
</template>

<script>
import { salaryText } from '@/utils/job'

export default {
  name: 'job-card',
  props: {
    job: {
      type: Object,
      default: () => ({
        id: '',
        title: '',
        salary: '',
        workArea: '',
        duration: '',
        isTop: false,
        isUrgent: false,
        employerName: '',
        employerVerified: false,
        createdAt: 0
      })
    }
  },
  methods: {
    salaryText,
    formatTime(ts) {
      const diff = Date.now() - ts
      const hour = 3600 * 1000
      if (diff < hour) return '刚刚'
      if (diff < 24 * hour) return Math.floor(diff / hour) + ' 小时前'
      if (diff < 7 * 24 * hour) return Math.floor(diff / (24 * hour)) + ' 天前'
      const d = new Date(ts)
      return (d.getMonth() + 1) + '月' + d.getDate() + '日'
    },
    goToDetail() {
      uni.navigateTo({ url: '/pages/jobDetail/jobDetail?id=' + this.job.id })
    }
  }
}
</script>

<style lang="scss" scoped>
.job-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.job-header { display: flex; align-items: center; justify-content: space-between; }
.title-wrap { display: flex; align-items: center; flex: 1; min-width: 0; }
.job-title { font-size: 34rpx; font-weight: 600; color: #222; margin-right: 12rpx; }
.badge { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; margin-right: 8rpx; }
.badge.top { background: #fff7e6; color: #fa8c16; }
.badge.urgent { background: #fff1f0; color: #e54d42; }
.job-salary { color: #e54d42; font-size: 36rpx; font-weight: 700; }
.unit { font-size: 22rpx; font-weight: 400; }
.job-meta { margin-top: 14rpx; display: flex; flex-wrap: wrap; }
.meta-item { font-size: 26rpx; color: #666; margin-right: 20rpx; }
.meta-item.distance { color: #1976d2; }
.job-footer { margin-top: 14rpx; display: flex; align-items: center; font-size: 24rpx; color: #999; }
.company { margin-right: 12rpx; }
.verified { color: #52c41a; border: 1rpx solid #52c41a; border-radius: 4rpx; padding: 0 8rpx; font-size: 20rpx; margin-right: 12rpx; }
.time { margin-left: auto; }
</style>