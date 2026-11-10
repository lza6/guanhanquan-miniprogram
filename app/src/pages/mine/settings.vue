<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">设置</block></cu-custom>

    <view class="group">
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
    <view class="version">管焊圈 v1.0.0</view>
  </view>
</template>

<script>
export default {
  methods: {
    openDoc(name) {
      const map = {
        'privacy-policy': '/pages/common/privacy-policy',
        'user-agreement': '/pages/common/user-agreement'
      }
      uni.navigateTo({ url: map[name] })
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
      uni.showModal({ title: '关于管焊圈', content: '面向焊工、管工、铆工、起重工的招工找活平台。', showCancel: false })
    },
    logout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出当前账号？',
        success: (r) => {
          if (!r.confirm) return
          uni.removeStorageSync('ghq_user')
          this.$store.commit('setUserInfo', null)
          uni.reLaunch({ url: '/pages/login/login' })
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
.arrow { color: #ccc; }
.logout { margin: 40rpx 24rpx 0; color: #e54d42; background: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.version { text-align: center; color: #bbb; font-size: 22rpx; margin-top: 30rpx; }
</style>