<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">隐私政策</block></cu-custom>
    <view class="doc">
      <view class="h">一、我们收集的信息</view>
      <view class="p">手机号、微信昵称与头像用于账号识别；发布招工信息时填写的联系人、联系电话用于工友与您联系；实名信息仅用于身份核验。</view>

      <view class="h">二、信息如何使用</view>
      <view class="p">联系方式在招工详情页默认脱敏展示，需消耗积分解锁后可见。黑名单记录仅展示经平台人工核实的举报，不展示举报人信息。</view>

      <view class="h">三、信息存储与保护</view>
      <view class="p">联系电话与身份证号加密存储；平台不会向第三方出售您的个人信息。</view>

      <view class="h">四、您的权利</view>
      <view class="p">您可以在「设置」中清除本地缓存、在「实名认证」中查看认证状态；如需注销账号或删除数据，可通过意见反馈联系我们。</view>

      <view class="h">五、联系我们</view>
      <view class="p">如对本政策有疑问，请在「意见反馈」中提交，我们会在 3 个工作日内回复。</view>
    </view>
  </view>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #fff; }
.doc { padding: 32rpx; }
.h { font-size: 30rpx; font-weight: 600; margin: 28rpx 0 12rpx; }
.p { font-size: 26rpx; color: #555; line-height: 1.8; }
</style>