<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack>
      <block slot="content">技能培训</block>
    </cu-custom>

    <view class="tabs">
      <view :class="['tab', tab === 'all' && 'active']" @tap="tab = 'all'">全部课程</view>
      <view :class="['tab', tab === 'mine' && 'active']" @tap="switchMine">我的课程</view>
    </view>

    <view v-if="tab === 'all'">
      <view class="card" v-for="c in courses" :key="c.id">
        <image v-if="c.cover" class="cover" :src="c.cover" mode="aspectFill" />
        <view class="body">
          <view class="title">{{ c.title }}</view>
          <view class="meta">
            <text class="teacher">{{ c.teacher }}</text>
            <text class="price">{{ c.price ? '¥' + c.price : '免费' }}</text>
          </view>
          <view class="intro">{{ c.intro }}</view>
          <button class="enroll" @tap="enroll(c)">报名学习</button>
        </view>
      </view>
      <view v-if="!courses.length" class="empty">暂无课程</view>
    </view>

    <view v-else>
      <view class="card" v-for="c in mine" :key="c.id">
        <view class="body">
          <view class="title">{{ c.title }}</view>
          <view class="meta"><text class="teacher">{{ c.teacher }}</text>
            <text class="price">报名于 {{ formatDate(c.enrolledAt) }}</text>
          </view>
        </view>
      </view>
      <view v-if="!mine.length" class="empty">还没有报名课程</view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return { tab: 'all', courses: [], mine: [] }
  },
  onLoad() {
    this.loadCourses()
  },
  methods: {
    formatDate(ts) {
      const d = new Date(ts)
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    },
    async loadCourses() {
      try {
        const res = await api.getTrainingList({})
        this.courses = res.data || []
      } catch (e) {
        this.courses = []
      }
    },
    async switchMine() {
      this.tab = 'mine'
      try {
        const res = await api.getMyCourses()
        this.mine = res.data.records || []
      } catch (e) {
        this.mine = []
      }
    },
    async enroll(c) {
      try {
        await api.enrollTraining(c.id)
        uni.showToast({ title: '报名成功', icon: 'success' })
      } catch (e) {}
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 26rpx 0; font-size: 28rpx; color: #666; }
.tab.active { color: #1976d2; font-weight: 600; border-bottom: 4rpx solid #1976d2; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; overflow: hidden; }
.cover { width: 100%; height: 260rpx; }
.body { padding: 28rpx; }
.title { font-size: 30rpx; font-weight: 600; }
.meta { display: flex; justify-content: space-between; margin-top: 12rpx; }
.teacher { font-size: 24rpx; color: #999; }
.price { font-size: 26rpx; color: #e54d42; }
.intro { margin-top: 10rpx; font-size: 24rpx; color: #999; }
.enroll { margin-top: 20rpx; background: #1976d2; color: #fff; border-radius: 40rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; }
.empty { text-align: center; color: #999; padding: 120rpx 0; font-size: 26rpx; }
</style>