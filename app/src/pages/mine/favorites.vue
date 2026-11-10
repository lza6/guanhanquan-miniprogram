<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">我的收藏</block></cu-custom>

    <view class="card" v-for="j in list" :key="j.id" @tap="goDetail(j)">
      <view class="row">
        <text class="title">{{ j.title }}</text>
        <text class="salary">{{ j.salary }}<text class="unit">元/天</text></text>
      </view>
      <view class="meta">{{ j.workArea }} · {{ j.duration }}</view>
      <view class="ops">
        <text class="link" @tap.stop="remove(j)">取消收藏</text>
      </view>
    </view>

    <view v-if="!loading && !list.length" class="empty">还没有收藏的岗位</view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() { return { list: [], loading: false } },
  onLoad() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await api.getFavorites({ page: 1, pageSize: 50 })
        this.list = (res.data && res.data.records) || []
      } catch (e) { this.list = [] } finally { this.loading = false }
    },
    goDetail(j) { uni.navigateTo({ url: '/pages/jobDetail/jobDetail?id=' + j.id }) },
    async remove(j) {
      try {
        await api.toggleFavorite(j.id)
        this.list = this.list.filter((x) => x.id !== j.id)
      } catch (e) {}
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.row { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 32rpx; font-weight: 600; }
.salary { color: #e54d42; font-size: 30rpx; font-weight: 700; }
.unit { font-size: 22rpx; font-weight: 400; }
.meta { margin-top: 10rpx; font-size: 24rpx; color: #999; }
.ops { margin-top: 16rpx; text-align: right; }
.link { color: #1976d2; font-size: 26rpx; }
.empty { text-align: center; color: #999; padding: 140rpx 0; font-size: 26rpx; }
</style>