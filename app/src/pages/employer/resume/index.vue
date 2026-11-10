<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green" isBack><block slot="content">工人简历库</block></cu-custom>

    <view class="search-box">
      <input v-model="keyword" placeholder="姓名、技能、地区" confirm-type="search" @confirm="reload" />
      <text class="btn" @tap="reload">搜索</text>
    </view>

    <view class="list">
      <view class="item" v-for="w in list" :key="w.id" @tap="open(w)">
        <image class="avatar" :src="w.avatar || '/static/img/default-avatar.png'" mode="aspectFill" />
        <view class="body">
          <view class="head">
            <text class="name">{{ w.name }}</text>
            <text v-if="w.certificateInfo" class="tag cert">{{ w.certificateInfo }}</text>
          </view>
          <view class="tags">
            <text class="tag" v-for="(t, i) in w.jobTypes" :key="i">{{ t }}</text>
          </view>
          <view class="meta">{{ w.workExperience }} · 期望 {{ w.expectArea || '不限' }} · {{ w.expectSalary || '面议' }}</view>
          <view class="foot">更新于 {{ ago(w.updatedAt) }}</view>
        </view>
      </view>
    </view>

    <view v-if="!loading && !list.length" class="hint">暂无简历</view>
    <view v-else-if="!hasMore && list.length" class="hint">没有更多了</view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() {
    return { keyword: '', list: [], page: 1, pageSize: 20, total: 0, loading: false, hasMore: true }
  },
  onLoad() { this.reload() },
  onReachBottom() { this.loadMore() },
  methods: {
    ago(ts) {
      if (!ts) return '-'
      const d = Date.now() - ts
      const h = 3600 * 1000
      if (d < h) return '刚刚'
      if (d < 24 * h) return Math.floor(d / h) + ' 小时前'
      return Math.floor(d / (24 * h)) + ' 天前'
    },
    async reload() {
      this.page = 1
      this.hasMore = true
      this.list = []
      await this.fetch(true)
    },
    async loadMore() {
      if (!this.hasMore || this.loading) return
      this.page += 1
      await this.fetch(false)
    },
    async fetch(reset) {
      if (this.loading) return
      this.loading = true
      try {
        const res = await api.getWorkerList({ page: this.page, pageSize: this.pageSize, keyword: this.keyword || undefined })
        const d = res.data || {}
        const records = d.records || []
        this.total = d.total || 0
        this.list = reset ? records : this.list.concat(records)
        this.hasMore = this.list.length < this.total
      } catch (e) {
        if (reset) this.list = []
      } finally {
        this.loading = false
      }
    },
    open(w) {
      uni.navigateTo({ url: '/pages/employer/resume/detail?id=' + w.id })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.search-box { display: flex; align-items: center; background: #fff; padding: 16rpx 24rpx; }
.search-box input { flex: 1; background: #f5f6f8; border-radius: 40rpx; height: 72rpx; padding: 0 24rpx; font-size: 28rpx; }
.btn { color: #1976d2; font-size: 28rpx; padding-left: 20rpx; }
.list { padding: 20rpx; }
.item { display: flex; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.avatar { width: 110rpx; height: 110rpx; border-radius: 50%; margin-right: 20rpx; }
.body { flex: 1; }
.head { display: flex; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; margin-right: 12rpx; }
.tags { display: flex; flex-wrap: wrap; margin-top: 8rpx; }
.tag { font-size: 22rpx; background: #eaf3ff; color: #1976d2; border-radius: 6rpx; padding: 2rpx 12rpx; margin-right: 10rpx; }
.tag.cert { background: #f6ffed; color: #52c41a; }
.meta { margin-top: 10rpx; font-size: 24rpx; color: #666; }
.foot { margin-top: 6rpx; font-size: 22rpx; color: #bbb; }
.hint { text-align: center; color: #999; font-size: 26rpx; padding: 40rpx 0; }
</style>