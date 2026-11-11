<template>
  <view class="login-page">
    <view class="brand">
      <image class="logo" src="/static/img/logo.png" mode="aspectFit" />
      <text class="name">管焊圈</text>
      <text class="slogan">焊工 · 管工 · 铆工，就近找活</text>
    </view>

    <view class="actions">
      <button class="login-btn" :loading="loading" @tap="wechatLogin">微信一键登录</button>

      <button v-if="needPhone" class="phone-btn" open-type="getPhoneNumber" @getphonenumber="bindPhone">
        绑定手机号（用于联系与找回）
      </button>

      <view class="skip" @tap="skip">先随便看看</view>
    </view>

    <view class="agree">
      登录即表示同意
      <text class="link" @tap="showDoc('user')">《用户协议》</text>
      和
      <text class="link" @tap="showDoc('privacy')">《隐私政策》</text>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'
import { setUser } from '@/utils/auth'

export default {
  data() {
    return {
      loading: false,
      needPhone: false
    }
  },
  methods: {
    async wechatLogin() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await api.login()
        const user = res.data.user
        this.$store.commit('setUserInfo', user)
        setUser(user)
        this.needPhone = !user.phone
        if (user.phone) this.finish()
      } catch (e) {
        // 请求层已提示
      } finally {
        this.loading = false
      }
    },
    async bindPhone(e) {
      const code = e.detail && e.detail.code
      if (!code) {
        uni.showToast({ title: '已取消授权', icon: 'none' })
        return
      }
      try {
        const res = await api.bindPhone(code)
        const user = Object.assign({}, this.$store.state.userInfo, { phone: res.data.phone })
        this.$store.commit('setUserInfo', user)
        setUser(user)
        this.needPhone = false
        uni.showToast({ title: '绑定成功', icon: 'success' })
        setTimeout(() => this.finish(), 600)
      } catch (err) {
        // 请求层已提示
      }
    },
    skip() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    finish() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    showDoc(name) {
      uni.navigateTo({
        url: name === 'user' ? '/pages/common/user-agreement' : '/pages/common/privacy-policy'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f2740 0%, #1b4b7a 60%, #2a6aa8 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 120rpx 60rpx 80rpx;
  box-sizing: border-box;
}
.brand { display: flex; flex-direction: column; align-items: center; }
.logo { width: 160rpx; height: 160rpx; margin-bottom: 32rpx; }
.name { font-size: 52rpx; color: #fff; font-weight: 700; letter-spacing: 4rpx; }
.slogan { font-size: 26rpx; color: rgba(255, 255, 255, 0.7); margin-top: 16rpx; }
.actions { display: flex; flex-direction: column; }
.login-btn {
  background: #ff8a00; color: #fff; border-radius: 48rpx;
  height: 92rpx; line-height: 92rpx; font-size: 32rpx; font-weight: 600;
}
.phone-btn {
  margin-top: 24rpx; background: transparent; color: #fff;
  border: 2rpx solid rgba(255, 255, 255, 0.6); border-radius: 48rpx;
  height: 92rpx; line-height: 88rpx; font-size: 30rpx;
}
.skip { text-align: center; color: rgba(255, 255, 255, 0.7); font-size: 26rpx; margin-top: 32rpx; }
.agree { text-align: center; font-size: 22rpx; color: rgba(255, 255, 255, 0.6); }
.link { color: #8fc3ff; }
</style>