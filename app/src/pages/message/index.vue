<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">消息通知</block></cu-custom>

    <view class="card announce" v-for="a in announcements" :key="a.id">
      <view class="head">
        <text class="title">{{ a.title }}</text>
        <text v-if="a.pinned" class="pin">置顶</text>
      </view>
      <view class="content">{{ a.content }}</view>
      <view class="time">{{ fmt(a.createdAt) }}</view>
    </view>

    <view class="bar">
      <text class="unread">未读 {{ unread }} 条</text>
      <text class="link" @tap="readAll">全部标为已读</text>
    </view>

    <view class="card" v-for="n in list" :key="n.id" @tap="read(n)">
      <view class="head">
        <text class="title">{{ n.title }}</text>
        <text class="dot" v-if="!n.isRead"></text>
      </view>
      <view class="content">{{ n.content }}</view>
      <view class="time">{{ fmt(n.createdAt) }}</view>
    </view>

    <view v-if="!loading && !list.length" class="empty">暂无消息</view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() { return { list: [], announcements: [], unread: 0, loading: false } },
  onLoad() { this.load(); this.loadAnnouncements() },
  methods: {
    fmt(ts) {
      const d = new Date(ts)
      const p = (n) => String(n).padStart(2, '0')
      return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    async loadAnnouncements() {
      try {
        const res = await api.getAnnouncements()
        this.announcements = res.data || []
      } catch (e) {
        this.announcements = []
      }
    },
    async load() {
      this.loading = true
      try {
        const res = await api.getNotifications({ page: 1, pageSize: 50 })
        this.list = (res.data && res.data.records) || []
        this.unread = (res.data && res.data.unread) || 0
      } catch (e) { this.list = [] } finally { this.loading = false }
    },
    async read(n) {
      if (n.isRead) return
      try {
        await api.markNotificationAsRead(n.id)
        n.isRead = true
        this.unread = Math.max(0, this.unread - 1)
      } catch (e) {}
    },
    async readAll() {
      try {
        await api.markAllNotificationsAsRead()
        this.load()
      } catch (e) {}
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.bar { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 30rpx; font-size: 26rpx; color: #666; }
.link { color: #1976d2; }
.card { background: #fff; margin: 0 20rpx 20rpx; border-radius: 16rpx; padding: 28rpx; }
.head { display: flex; align-items: center; }
.title { font-size: 30rpx; font-weight: 600; }
.dot { width: 12rpx; height: 12rpx; background: #e54d42; border-radius: 50%; margin-left: 12rpx; }
.pin { font-size: 20rpx; color: #fa8c16; border: 1rpx solid #fa8c16; border-radius: 6rpx; padding: 2rpx 8rpx; margin-left: 12rpx; }
.announce { border-left: 6rpx solid #1976d2; }
.content { margin-top: 10rpx; font-size: 26rpx; color: #666; line-height: 1.6; }
.time { margin-top: 12rpx; font-size: 22rpx; color: #bbb; }
.empty { text-align: center; color: #999; padding: 140rpx 0; font-size: 26rpx; }
</style>