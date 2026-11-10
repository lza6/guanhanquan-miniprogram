<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green" :isBack="false"><block slot="content">找活</block></cu-custom>

    <view class="search-box">
      <view class="search-bar">
        <input v-model="keyword" placeholder="工种、地区、老板" confirm-type="search" @confirm="reload" />
        <text class="btn" @tap="reload">搜索</text>
      </view>
    </view>

    <view class="filter-bar">
      <view :class="['chip', { active: sort === '' }]" @tap="setSort('')">最新</view>
      <view :class="['chip', { active: sort === 'salary' }]" @tap="setSort('salary')">薪资高</view>
      <view :class="['chip', { active: within === 24 }]" @tap="setWithin(24)">24小时</view>
      <view :class="['chip', { active: within === 168 }]" @tap="setWithin(168)">一周内</view>
    </view>

    <view class="list">
      <view class="item" v-for="job in list" :key="job.id" @tap="goDetail(job)">
        <view class="head">
          <view class="title-row">
            <text class="title">{{ job.title }}</text>
            <text v-if="job.isTop" class="badge top">置顶</text>
            <text v-if="job.isUrgent" class="badge urgent">急招</text>
          </view>
          <text class="salary">{{ job.salary }}<text class="unit">元/天</text></text>
        </view>
        <view class="meta">
          <text>{{ job.workArea }}</text>
          <text v-if="job.duration"> · {{ job.duration }}</text>
        </view>
        <view class="foot">
          <text class="company">{{ job.employerName || '雇主' }}</text>
          <text class="time">{{ ago(job.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="hint">加载中...</view>
    <view v-else-if="!list.length" class="hint">暂无相关岗位</view>
    <view v-else-if="!hasMore" class="hint">没有更多了</view>

    <view class="tab-space"></view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return {
      keyword: '',
      sort: '',
      within: '',
      list: [],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true
    }
  },
  onLoad() { this.reload() },
  onPullDownRefresh() { this.reload(); uni.stopPullDownRefresh() },
  onReachBottom() { this.loadMore() },
  methods: {
    ago(ts) {
      if (!ts) return ''
      const d = Date.now() - ts
      const h = 3600 * 1000
      if (d < h) return '刚刚'
      if (d < 24 * h) return Math.floor(d / h) + ' 小时前'
      if (d < 7 * 24 * h) return Math.floor(d / (24 * h)) + ' 天前'
      return ''
    },
    setSort(v) { this.sort = v; this.reload() },
    setWithin(v) { this.within = this.within === v ? '' : v; this.reload() },
    params(page) {
      return {
        page,
        pageSize: this.pageSize,
        keyword: this.keyword || undefined,
        sort: this.sort || undefined,
        createdWithin: this.within || undefined
      }
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
        const res = await api.getJobList(this.params(this.page))
        const data = res.data || {}
        const records = data.records || []
        this.total = data.total || 0
        this.list = reset ? records : this.list.concat(records)
        this.hasMore = this.list.length < this.total
      } catch (e) {
        if (reset) this.list = []
      } finally {
        this.loading = false
      }
    },
    goDetail(job) {
      uni.navigateTo({ url: '/pages/jobDetail/jobDetail?id=' + job.id })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.search-box { background: #fff; padding: 16rpx 24rpx; }
.search-bar { display: flex; align-items: center; background: #f5f6f8; border-radius: 40rpx; padding: 0 24rpx; height: 72rpx; }
.search-bar input { flex: 1; font-size: 28rpx; }
.btn { color: #1976d2; font-size: 28rpx; padding-left: 16rpx; }
.filter-bar { display: flex; background: #fff; padding: 0 24rpx 20rpx; }
.chip { padding: 8rpx 24rpx; margin-right: 16rpx; border-radius: 30rpx; background: #f5f6f8; color: #666; font-size: 24rpx; }
.chip.active { background: #1976d2; color: #fff; }
.list { padding: 20rpx; }
.item { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 20rpx; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title-row { display: flex; align-items: center; flex: 1; }
.title { font-size: 34rpx; font-weight: 600; margin-right: 12rpx; }
.badge { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; margin-right: 8rpx; }
.badge.top { background: #fff7e6; color: #fa8c16; }
.badge.urgent { background: #fff1f0; color: #e54d42; }
.salary { color: #e54d42; font-size: 34rpx; font-weight: 700; }
.unit { font-size: 22rpx; font-weight: 400; }
.meta { margin-top: 12rpx; font-size: 26rpx; color: #666; }
.foot { margin-top: 12rpx; display: flex; justify-content: space-between; font-size: 24rpx; color: #999; }
.hint { text-align: center; color: #999; font-size: 26rpx; padding: 40rpx 0; }
.tab-space { height: 40rpx; }
</style>