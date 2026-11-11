<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">设置</block></cu-custom>

    <view class="group">
      <button class="item item-btn" open-type="getPhoneNumber" @getphonenumber="bindPhone">
        <text>修改手机号</text><text class="arrow">›</text>
      </button>
      <view class="item">
        <text>在简历中展示手机号</text>
        <switch :checked="showPhone" color="#1976d2" @change="toggleShowPhone" />
      </view>
      <view class="item" @tap="openDoc('privacy-policy')">
        <text>隐私政策</text><text class="arrow">›</text>
      </view>
      <view class="item" @tap="openDoc('user-agreement')">
        <text>用户协议</text><text class="arrow">›</text>
      </view>
      <view class="item" @tap="clearCache">
        <text>清除缓存</text><text class="arrow">›</text>
      </view>
      <view class="item" @tap="about">
        <text>关于我们</text><text class="arrow">›</text>
      </view>
    </view>

    <button class="logout" @tap="logout">退出登录</button>
    <button class="danger" @tap="deleteAccount">注销账号</button>
    <view class="version">管焊圈 v1.0.0</view>
  </view>
</template>

<script>
import api from '@/api/index.js'
import { clearAuth, getUser, setUser } from '@/utils/auth'

export default {
  data() {
    return { showPhone: true }
  },
  onShow() {
    const u = getUser() || {}
    this.showPhone = u.showPhone !== false
  },
  methods: {
    openDoc(name) {
      const map = {
        'privacy-policy': '/pages/common/privacy-policy',
        'user-agreement': '/pages/common/user-agreement'
      }
      uni.navigateTo({ url: map[name] })
    },
    async bindPhone(e) {
      const code = e.detail && e.detail.code
      if (!code) return uni.showToast({ title: '已取消授权', icon: 'none' })
      try {
        const res = await api.bindPhone(code)
        const u = Object.assign({}, getUser() || {}, { phone: res.data.phone })
        setUser(u)
        uni.showToast({ title: '已更新手机号', icon: 'success' })
      } catch (err) {}
    },
    async toggleShowPhone(e) {
      const value = !!e.detail.value
      this.showPhone = value
      try {
        const res = await api.updateUserProfile({ showPhone: value })
        setUser(res.data)
      } catch (err) {
        this.showPhone = !value
      }
    },
    clearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '将清除本地缓存（不影响账号数据）',
        success: (r) => {
          if (!r.confirm) return
          uni.clearStorageSync()
          uni.showToast({ title: '已清除', icon: 'success' })
        }
      })
    },
    about() {
      uni.showModal({
        title: '关于管焊圈',
        content: '面向焊工、管工、铆工、起重工的招工找活平台。运营主体：沈阳市苏家屯区管焊圈互联网服务网店。',
        showCancel: false
      })
    },
    logout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出当前账号？',
        success: (r) => {
          if (!r.confirm) return
          clearAuth()
          this.$store.commit('setUserInfo', null)
          uni.reLaunch({ url: '/pages/login/login' })
        }
      })
    },
    deleteAccount() {
      uni.showModal({
        title: '注销账号',
        content: '注销后将无法登录，历史招工/报名记录保留用于审计。确认注销？',
        confirmText: '确认注销',
        confirmColor: '#e54d42',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.deleteAccount()
            clearAuth()
            uni.reLaunch({ url: '/pages/login/login' })
          } catch (e) {}
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.group { background: #fff; margin-top: 20rpx; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f5f5f5; font-size: 30rpx; }
.item:last-child { border-bottom: none; }
.item-btn { margin: 0; background: #fff; border-radius: 0; text-align: left; line-height: normal; }
.item-btn::after { border: none; }
.arrow { color: #ccc; }
.logout { margin: 40rpx 24rpx 0; color: #e54d42; background: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.danger { margin: 20rpx 24rpx 0; color: #999; background: transparent; font-size: 26rpx; }
.version { text-align: center; color: #bbb; font-size: 22rpx; margin-top: 30rpx; }
</style>