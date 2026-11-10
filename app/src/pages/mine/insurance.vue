<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack>
      <block slot="content">保险</block>
    </cu-custom>

    <view class="tabs">
      <view :class="['tab', tab === 'buy' && 'active']" @tap="tab = 'buy'">可购买</view>
      <view :class="['tab', tab === 'mine' && 'active']" @tap="switchMine">我的保单</view>
    </view>

    <view v-if="tab === 'buy'">
      <view class="card" v-for="item in products" :key="item.id">
        <view class="item-head">
          <text class="name">{{ item.name }}</text>
          <text class="price">¥{{ item.price }}</text>
        </view>
        <view class="coverage">{{ item.coverage }}</view>
        <view class="intro">{{ item.intro }}</view>
        <button class="buy" @tap="buy(item)">购买</button>
      </view>
      <view v-if="!products.length && !loading" class="empty">暂无可购买的保险</view>
    </view>

    <view v-else>
      <view class="card" v-for="p in policies" :key="p.id">
        <view class="item-head">
          <text class="name">{{ p.name }}</text>
          <text class="price">¥{{ p.price }}</text>
        </view>
        <view class="intro">购买时间：{{ formatDate(p.createdAt) }}</view>
      </view>
      <view v-if="!policies.length" class="empty">还没有购买记录</view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return {
      tab: 'buy',
      products: [],
      policies: [],
      loading: false
    }
  },
  onLoad() {
    this.loadProducts()
  },
  methods: {
    formatDate(ts) {
      const d = new Date(ts)
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    },
    async loadProducts() {
      this.loading = true
      try {
        const res = await api.getInsuranceList()
        this.products = res.data || []
      } catch (e) {
        this.products = []
      } finally {
        this.loading = false
      }
    },
    async switchMine() {
      this.tab = 'mine'
      try {
        const res = await api.getUserInsurances()
        this.policies = res.data || []
      } catch (e) {
        this.policies = []
      }
    },
    async buy(item) {
      uni.showModal({
        title: '确认购买',
        content: `将扣除余额 ¥${item.price}`,
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.buyInsurance(item.id, {})
            uni.showToast({ title: '购买成功', icon: 'success' })
            this.switchMine()
          } catch (e) {
            // 余额不足等提示由请求层给出
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 26rpx 0; font-size: 28rpx; color: #666; }
.tab.active { color: #1976d2; font-weight: 600; border-bottom: 4rpx solid #1976d2; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.item-head { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 600; }
.price { color: #e54d42; font-size: 32rpx; font-weight: 700; }
.coverage { margin-top: 12rpx; font-size: 26rpx; color: #1976d2; }
.intro { margin-top: 8rpx; font-size: 24rpx; color: #999; }
.buy { margin-top: 20rpx; background: #1976d2; color: #fff; border-radius: 40rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; }
.empty { text-align: center; color: #999; padding: 120rpx 0; font-size: 26rpx; }
</style>