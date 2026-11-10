<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green" isBack><block slot="content">积分与余额</block></cu-custom>

    <view class="balance-card">
      <view class="item">
        <text class="num">{{ info.points }}</text>
        <text class="label">积分</text>
      </view>
      <view class="divider"></view>
      <view class="item">
        <text class="num">{{ info.balance }}</text>
        <text class="label">余额（元）</text>
      </view>
    </view>

    <view class="actions">
      <button class="sign" :disabled="info.signedToday" @tap="signIn">
        {{ info.signedToday ? '今日已签到' : '签到 +' + info.signInPoints + ' 积分' }}
      </button>
      <button class="recharge" @tap="recharge">充值</button>
    </view>

    <view class="card" v-if="err"><text class="err">加载失败：{{ err }}</text></view>

    <view class="card rules">
      <view class="section-title">消耗说明</view>
      <view class="rule"><text>查看联系方式</text><text class="cost">{{ info.contactCost }} 积分 / 次</text></view>
      <view class="rule"><text>信息置顶 7 天</text><text class="cost">{{ info.topCost }} 积分 / 次</text></view>
    </view>

    <view class="card">
      <view class="section-title">收支记录</view>
      <view v-for="r in records" :key="r.id" class="record">
        <view>
          <text class="biz">{{ r.businessType || '其他' }}</text>
          <text class="remark">{{ r.remark }}</text>
        </view>
        <text :class="r.amount > 0 ? 'plus' : 'minus'">{{ r.amount > 0 ? '+' : '' }}{{ r.amount }}</text>
      </view>
      <view v-if="!records.length" class="empty">暂无记录</view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() {
    return {
      err: '',
      info: { points: 0, balance: 0, signedToday: false, contactCost: 5, topCost: 30, signInPoints: 2 },
      records: []
    }
  },
  onLoad() { this.load() },
  methods: {
    async load() {
      this.err = ''
      try {
        const w = await api.getWallet()
        this.info = w.data || this.info
      } catch (e) {
        this.err = '账户信息：' + (e && (e.message || e.errMsg)) || '未知'
      }
      try {
        const r = await api.getWalletRecords({ page: 1, pageSize: 30 })
        this.records = (r.data && r.data.records) || []
      } catch (e2) {
        this.err = (this.err ? this.err + '；' : '') + '流水：' + (e2 && (e2.message || e2.errMsg)) || '未知'
      }
    },

    async signIn() {
      if (this.info.signedToday) return
      try {
        const res = await api.signIn()
        this.info.signedToday = true
        this.info.points = res.data.points
        uni.showToast({ title: '+' + res.data.points + ' 积分', icon: 'success' })
        this.load()
      } catch (e) {}
    },
    recharge() {
      uni.showModal({
        title: '充值',
        content: '微信支付需在小程序内接入商户号后开放，当前可先通过签到获得积分。',
        showCancel: false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.balance-card { background: linear-gradient(135deg, #1b4b7a, #2a6aa8); display: flex; padding: 40rpx 0; }
.item { flex: 1; text-align: center; color: #fff; }
.num { font-size: 48rpx; font-weight: 700; display: block; }
.label { font-size: 24rpx; opacity: .8; }
.divider { width: 1rpx; background: rgba(255,255,255,.25); }
.actions { display: flex; padding: 24rpx; }
.sign { flex: 1; background: #ff8a00; color: #fff; border-radius: 44rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; margin-right: 16rpx; }
.sign[disabled] { background: #d9d9d9; }
.recharge { width: 200rpx; background: #fff; color: #1976d2; border-radius: 44rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.card { background: #fff; margin: 0 20rpx 20rpx; border-radius: 16rpx; padding: 28rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.rule { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; color: #666; }
.cost { color: #e54d42; }
.record { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.biz { font-size: 28rpx; display: block; }
.remark { font-size: 22rpx; color: #999; }
.plus { color: #52c41a; font-size: 30rpx; }
.minus { color: #e54d42; font-size: 30rpx; }
.err { color: #e54d42; font-size: 26rpx; }
.empty { text-align: center; color: #999; font-size: 26rpx; padding: 30rpx 0; }
</style>