<template>
  <view class="page">
    <cu-custom bgColor="bg-white" isBack><block slot="content">用户协议</block></cu-custom>
    <view class="doc">
      <view class="h">一、服务内容</view>
      <view class="p">管焊圈为招工方与工人提供信息发布与浏览服务，平台不参与用工关系，不代收工资。</view>

      <view class="h">二、信息发布规范</view>
      <view class="p">发布的岗位信息须真实、完整，不得含有虚假薪资、收费招聘、违法违规内容。平台有权对信息进行审核、驳回或下架。</view>

      <view class="h">三、用户行为规范</view>
      <view class="p">不得恶意举报、批量发布重复信息、冒用他人身份。违规账号将被限制功能或封禁。</view>

      <view class="h">四、积分与置顶</view>
      <view class="p">积分可通过签到或充值获得，用于解锁联系方式与置顶信息。已消耗的积分不予退还。</view>

      <view class="h">五、免责与争议</view>
      <view class="p">用工过程中的薪资、工伤等争议由双方自行协商或通过法律途径解决。平台黑名单信息仅供参考，不作为任何法律结论。</view>
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