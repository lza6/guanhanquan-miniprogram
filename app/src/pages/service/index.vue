<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green" isBack><block slot="content">客服中心</block></cu-custom>

    <view class="card">
      <view class="section-title">常见问题</view>
      <view class="faq" v-for="(f, i) in faqs" :key="i" @tap="toggle(i)">
        <view class="q">
          <text>{{ f.q }}</text>
          <text class="arrow">{{ open === i ? '−' : '+' }}</text>
        </view>
        <view v-if="open === i" class="a">{{ f.a }}</view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">联系我们</view>
      <button class="item item-btn" open-type="contact">
        <text>在线客服</text><text class="link">微信会话</text>
      </button>
      <view class="item" @tap="feedback">
        <text>意见反馈</text><text class="link">提交问题</text>
      </view>
      <view class="item" @tap="feedback">
        <text>意见反馈</text><text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      open: -1,
      faqs: [
        { q: '发布招工收费吗？', a: '发布免费，信息需经平台审核。置顶展示需消耗积分。' },
        { q: '为什么看不到老板电话？', a: '联系方式默认脱敏，消耗积分后才能查看，用于防止信息被批量抓取。' },
        { q: '积分怎么获得？', a: '每日签到可得 2 积分，也可在「积分与余额」页充值。' },
        { q: '信息多久过期？', a: '默认 7 天，到期自动下架；可在个人中心重新发布。' },
        { q: '黑老板标记为什么查不到？', a: '标记需人工核实，通过后才会对外展示；恶意举报会被封号。' },
        { q: '遇到欠薪怎么办？', a: '保留聊天记录、考勤与工资凭证，先向当地人社部门投诉，平台可提供举报记录协助。' }
      ]
    }
  },
  methods: {
    toggle(i) { this.open = this.open === i ? -1 : i },

    feedback() { uni.navigateTo({ url: '/pages/mine/feedback' }) }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 12rpx; }
.faq { border-top: 1rpx solid #f5f5f5; padding: 20rpx 0; }
.faq:first-of-type { border-top: none; }
.q { display: flex; justify-content: space-between; font-size: 28rpx; color: #333; }
.arrow { color: #999; }
.a { margin-top: 12rpx; font-size: 26rpx; color: #888; line-height: 1.7; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-top: 1rpx solid #f5f5f5; font-size: 28rpx; }
.item:first-of-type { border-top: none; }
.link { color: #1976d2; }
.item-btn { margin: 0; background: #fff; border-radius: 0; text-align: left; line-height: normal; font-size: 28rpx; }
.item-btn::after { border: none; }
.arrow { color: #ccc; }
</style>