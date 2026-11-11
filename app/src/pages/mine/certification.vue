<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">实名认证</block></cu-custom>

    <view class="card" v-if="status === 1">
      <view class="done">已通过实名认证</view>
      <view class="sub">姓名：{{ maskedName }}</view>
    </view>

    <view v-else>
      <view class="card">
        <view class="tip">实名信息仅用于核验身份，平台加密存储，不对外展示。</view>
        <view class="row">
          <text class="label">真实姓名</text>
          <input class="input" v-model="form.realName" placeholder="与身份证一致" maxlength="20" />
        </view>
        <view class="row">
          <text class="label">身份证号</text>
          <input class="input" v-model="form.idCard" placeholder="18 位身份证号" maxlength="18" />
        </view>
      </view>
      <button class="submit" :loading="submitting" @tap="submit">提交认证</button>
      <view class="notice" v-if="status === 0">资料已提交，等待平台核验。</view>
      <view class="notice danger" v-if="status === 2">未通过：{{ rejectReason || '资料不完整' }}</view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'
export default {
  data() {
    return { form: { realName: '', idCard: '' }, status: -1, maskedName: '', rejectReason: '', submitting: false }
  },
  onLoad() {
    this.loadProfile()
  },
  methods: {
    async loadProfile() {
      try {
        const res = await api.getUserProfile()
        const u = res.data
        this.status = u.realNameVerified ? 1 : (u.realNameStatus === 0 ? 0 : (u.realNameStatus === 2 ? 2 : -1))
        this.maskedName = u.realName || ''
        this.rejectReason = u.realNameRejectReason || ''
      } catch (e) {}
    },
    async submit() {
      if (!this.form.realName || this.form.realName.length < 2) {
        uni.showToast({ title: '请填写真实姓名', icon: 'none' })
        return
      }
      if (!/^\d{17}[\dXx]$/.test(this.form.idCard)) {
        uni.showToast({ title: '身份证号格式不正确', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await api.submitRealName(this.form)
        this.status = 0
        uni.showToast({ title: '已提交', icon: 'success' })
      } catch (e) {} finally { this.submitting = false }
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.tip { font-size: 24rpx; color: #999; line-height: 1.6; margin-bottom: 20rpx; }
.row { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { width: 160rpx; color: #666; font-size: 28rpx; }
.input { flex: 1; font-size: 28rpx; }
.submit { margin: 30rpx 24rpx; background: #1976d2; color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.notice { text-align: center; color: #fa8c16; font-size: 24rpx; }
.notice.danger { color: #e54d42; }
.done { font-size: 32rpx; color: #52c41a; font-weight: 600; }
.sub { margin-top: 12rpx; font-size: 26rpx; color: #666; }
</style>