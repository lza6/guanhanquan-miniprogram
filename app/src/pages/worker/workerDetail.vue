<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack>
      <block slot="content">工人简历</block>
    </cu-custom>

    <view v-if="worker" class="content">
      <view class="card head">
        <image class="avatar" :src="worker.avatar || '/static/img/default-avatar.png'" mode="aspectFill" />
        <view class="head-info">
          <view class="name-row">
            <text class="name">{{ worker.name }}</text>
            <text v-if="worker.certificateInfo" class="verified">持证</text>
          </view>
          <text class="sub">{{ worker.workExperience }}经验 · {{ worker.availableTime }}到岗</text>
        </view>
      </view>

      <view class="card">
        <view class="section-title">技能</view>
        <view class="tags">
          <text class="tag" v-for="(t, i) in worker.jobTypes" :key="i">{{ t }}</text>
        </view>
        <view class="row"><text class="label">证书</text><text class="value">{{ worker.certificateInfo || '未填写' }}</text></view>
        <view class="row"><text class="label">技术</text><text class="value">{{ worker.techDescription || '未填写' }}</text></view>
      </view>

      <view class="card">
        <view class="section-title">求职意向</view>
        <view class="row"><text class="label">期望地区</text><text class="value">{{ worker.expectArea || '不限' }}</text></view>
        <view class="row"><text class="label">期望薪资</text><text class="value">{{ worker.expectSalary || '面议' }}</text></view>
        <view class="row"><text class="label">联系方式</text><text class="value phone">{{ worker.contactPhone || '登录后可见' }}</text></view>
      </view>

      <view class="card" v-if="reviews.length">
        <view class="section-title">雇主评价（{{ average }} 分）</view>
        <view class="review" v-for="(r, i) in reviews" :key="i">
          <view class="review-head">
            <text class="reviewer">{{ r.fromName || '雇主' }}</text>
            <text class="rating">{{ r.rating }} 星</text>
          </view>
          <text class="review-content">{{ r.content }}</text>
        </view>
      </view>

      <view class="card empty" v-if="!reviews.length">
        <text>暂无评价</text>
      </view>
    </view>

    <view v-if="!worker && !loading" class="empty-page">简历不存在或已关闭</view>

    <view class="bottom-bar" v-if="worker">
      <button class="primary" @tap="contactWorker">联系 TA</button>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return { id: '', worker: null, reviews: [], loading: false, average: 0 }
  },
  onLoad(options) {
    this.id = options.id || ''
    if (this.id) this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await api.getWorkerDetail(this.id)
        this.worker = res.data
        this.loadReviews()
      } catch (e) {
        this.worker = null
      } finally {
        this.loading = false
      }
    },
    async loadReviews() {
      try {
        const res = await api.getReviewsForWorker(this.id)
        this.reviews = res.data.records || []
        this.average = res.data.average || 0
      } catch (e) {
        this.reviews = []
      }
    },
    contactWorker() {
      const phone = this.worker.contactPhone || ''
      if (!phone || phone.indexOf('*') >= 0) {
        uni.showToast({ title: '请以雇主身份登录并完成企业认证后查看', icon: 'none' })
        return
      }
      uni.makePhoneCall({ phoneNumber: phone })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 140rpx; }
.content { padding: 20rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 20rpx; }
.head { display: flex; align-items: center; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; margin-right: 24rpx; }
.name-row { display: flex; align-items: center; }
.name { font-size: 36rpx; font-weight: 600; }
.verified { margin-left: 12rpx; font-size: 22rpx; color: #52c41a; border: 1rpx solid #52c41a; border-radius: 4rpx; padding: 0 8rpx; }
.sub { display: block; margin-top: 8rpx; font-size: 24rpx; color: #999; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.tags { display: flex; flex-wrap: wrap; margin-bottom: 12rpx; }
.tag { background: #eaf3ff; color: #1976d2; font-size: 24rpx; padding: 6rpx 16rpx; border-radius: 8rpx; margin: 0 12rpx 12rpx 0; }
.row { display: flex; padding: 12rpx 0; font-size: 28rpx; }
.label { width: 140rpx; color: #999; flex-shrink: 0; }
.value { color: #333; flex: 1; }
.value.phone { color: #1976d2; font-weight: 600; }
.review { border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; margin-top: 16rpx; }
.review-head { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.reviewer { font-size: 26rpx; color: #333; }
.rating { font-size: 24rpx; color: #fa8c16; }
.review-content { font-size: 26rpx; color: #666; line-height: 1.6; }
.empty { text-align: center; color: #999; font-size: 26rpx; }
.empty-page { text-align: center; color: #999; padding: 160rpx 0; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 16rpx 24rpx calc(16rpx + constant(safe-area-inset-bottom)); }
.primary { background: #1976d2; color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>