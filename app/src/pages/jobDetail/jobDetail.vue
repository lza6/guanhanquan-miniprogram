<template>
  <view class="job-detail">
    <cu-custom bgColor="bg-gradient-green">
      <block slot="content">招工详情</block>
    </cu-custom>

    <view v-if="job" class="content">
      <view class="card header-card">
        <view class="title-row">
          <text class="job-title">{{ job.title }}</text>
          <text v-if="job.isUrgent" class="tag urgent">急招</text>
          <text v-if="job.isTop" class="tag top">置顶</text>
        </view>
        <view class="salary">
          <text class="amount">{{ job.salary }}</text>
          <text class="unit">元/天</text>
          <text v-if="job.duration" class="duration">{{ job.duration }}</text>
        </view>
        <view class="meta">
          <text class="ci-location">{{ job.workArea }}</text>
          <text class="views">{{ job.viewCount }} 人看过</text>
        </view>
      </view>

      <view class="card">
        <view class="section-title">岗位要求</view>
        <view class="row"><text class="label">证书</text><text class="value">{{ job.certificateReq || '不限' }}</text></view>
        <view class="row"><text class="label">年龄</text><text class="value">{{ job.ageLimit || '不限' }}</text></view>
        <view class="row"><text class="label">技术</text><text class="value">{{ job.techReq || '不限' }}</text></view>
        <view class="row" v-if="job.otherReq"><text class="label">其他</text><text class="value">{{ job.otherReq }}</text></view>
      </view>

      <view class="card">
        <view class="section-title">待遇</view>
        <view class="row"><text class="label">发放</text><text class="value">{{ payTypeText }}</text></view>
        <view class="row"><text class="label">食宿</text><text class="value">{{ accommodationText }}</text></view>
        <view class="row"><text class="label">路费</text><text class="value">{{ travelText }}</text></view>
        <view class="row" v-if="job.otherBenefits"><text class="label">福利</text><text class="value">{{ job.otherBenefits }}</text></view>
      </view>

      <view class="card">
        <view class="section-title">联系方式</view>
        <view class="row"><text class="label">联系人</text><text class="value">{{ job.contactName || '-' }}</text></view>
        <view class="row">
          <text class="label">电话</text>
          <text v-if="job.contactUnlocked" class="value phone" @tap="callPhone">{{ job.contactPhone }}</text>
          <text v-else class="value locked" @tap="unlock">{{ job.contactPhone }} · 消耗 {{ job.unlockCost }} 积分解锁</text>
        </view>
        <view class="row" v-if="job.wechatSame"><text class="label"></text><text class="value tip">微信同号</text></view>
      </view>

      <view class="card" v-if="job.employerName">
        <view class="section-title">发布方</view>
        <view class="employer">
          <text class="name">{{ job.employerName }}</text>
          <text v-if="job.employerVerified" class="verified">已认证</text>
        </view>
      </view>

      <view class="card">
        <view class="row action-row" @tap="queryBlack">
          <text class="value link">查这个老板有没有被举报过</text>
        </view>
        <view class="row action-row" @tap="reportJob">
          <text class="value link">举报这条信息</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && !job" class="empty"><text>信息不存在或已下架</text></view>

    <view class="bottom-bar" v-if="job">
      <view class="fav" @tap="toggleFavorite">
        <text :class="favorited ? 'fav-on' : 'fav-off'">{{ favorited ? '已收藏' : '收藏' }}</text>
      </view>
      <button v-if="!job.isOwner" class="primary" :class="{ applied: applied }" @tap="applyJob">
        {{ applied ? '已报名' : '报名' }}
      </button>
      <button v-if="job.isOwner" class="primary" @tap="goManage">管理信息</button>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

const PAY_TYPES = { 1: '压一付一', 2: '月结', 3: '完工结算', 4: '公司直发', 5: '面议' }
const ACCOMMODATION = { 1: '管吃住', 2: '管住不管吃', 3: '不管吃住', 4: '面议' }
const TRAVEL = { 1: '报销往返', 2: '报销单程', 3: '不报销', 4: '面议' }

export default {
  data() {
    return {
      jobId: '',
      job: null,
      loading: true,
      applied: false,
      favorited: false,
      unlocking: false
    }
  },
  computed: {
    payTypeText() {
      return PAY_TYPES[this.job && this.job.payType] || '面议'
    },
    accommodationText() {
      return ACCOMMODATION[this.job && this.job.accommodation] || '面议'
    },
    travelText() {
      return TRAVEL[this.job && this.job.travelReimburse] || '面议'
    }
  },
  onLoad(options) {
    this.jobId = options.id || options.jobId || ''
    if (!this.jobId) {
      this.loading = false
      return
    }
    this.load()
  },
  onShareAppMessage() {
    return {
      title: this.job ? this.job.title + ' ' + this.job.salary + ' 元/天' : '管焊圈招工',
      path: '/pages/jobDetail/jobDetail?id=' + this.jobId
    }
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await api.getJobDetail(this.jobId)
        this.job = res.data
        await this.checkApplied()
        await this.checkFavorite()
      } catch (e) {
        this.job = null
      } finally {
        this.loading = false
      }
    },
    async checkApplied() {
      try {
        const res = await api.checkJobApplication(this.jobId)
        this.applied = res.data.applied
      } catch (e) {
        this.applied = false
      }
    },
    async checkFavorite() {
      try {
        const res = await api.checkFavorite(this.jobId)
        this.favorited = res.data.favorited
      } catch (e) {
        this.favorited = false
      }
    },
    unlock() {
      uni.showModal({
        title: '解锁联系方式',
        content: `将消耗 ${this.job.unlockCost} 积分查看老板电话，确认继续？`,
        success: (r) => { if (r.confirm) this.doUnlock() }
      })
    },
    async doUnlock() {
      if (this.unlocking) return
      this.unlocking = true
      try {
        const res = await api.unlockContact(this.jobId)
        this.job.contactPhone = res.data.contactPhone
        this.job.contactUnlocked = true
        uni.showToast({ title: '已解锁', icon: 'success' })
      } catch (e) {
        // 积分不足等错误已由请求层提示
      } finally {
        this.unlocking = false
      }
    },
    callPhone() {
      uni.makePhoneCall({ phoneNumber: this.job.contactPhone })
    },
    async applyJob() {
      if (this.applied) return
      try {
        await api.applyForJob(this.jobId, {})
        this.applied = true
        uni.showToast({ title: '报名成功', icon: 'success' })
      } catch (e) {
        // 重复报名等错误已提示
      }
    },
    async toggleFavorite() {
      try {
        const res = await api.toggleFavorite(this.jobId)
        this.favorited = res.data.favorited
      } catch (e) {}
    },
    queryBlack() {
      uni.navigateTo({ url: '/pages/blacklist/query?phone=' + (this.job.contactUnlocked ? this.job.contactPhone : '') })
    },
    reportJob() {
      uni.navigateTo({ url: '/pages/report/report?id=' + this.jobId })
    },
    goManage() {
      uni.navigateTo({ url: '/pages/employer/jobManage' })
    }
  }
}
</script>

<style lang="scss" scoped>
.job-detail {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 140rpx;
}
.content { padding: 20rpx; }
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.header-card { padding-top: 32rpx; }
.title-row { display: flex; align-items: center; }
.job-title { font-size: 38rpx; font-weight: 600; margin-right: 16rpx; }
.tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; margin-left: 12rpx; }
.tag.urgent { background: #ffece8; color: #e54d42; }
.tag.top { background: #fff7e6; color: #fa8c16; }
.salary { margin-top: 16rpx; display: flex; align-items: baseline; }
.amount { font-size: 44rpx; color: #e54d42; font-weight: 700; }
.unit { font-size: 24rpx; color: #e54d42; margin-left: 6rpx; }
.duration { font-size: 24rpx; color: #888; margin-left: 20rpx; }
.meta { margin-top: 12rpx; display: flex; justify-content: space-between; font-size: 24rpx; color: #888; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.row { display: flex; padding: 12rpx 0; font-size: 28rpx; }
.label { width: 110rpx; color: #999; flex-shrink: 0; }
.value { color: #333; flex: 1; }
.value.phone { color: #1976d2; font-weight: 600; }
.value.locked { color: #fa8c16; }
.value.tip { color: #52c41a; font-size: 24rpx; }
.value.link { color: #1976d2; }
.action-row { border-top: 1rpx solid #f0f0f0; }
.action-row:first-child { border-top: none; }
.employer { display: flex; align-items: center; }
.name { font-size: 30rpx; margin-right: 12rpx; }
.verified { font-size: 22rpx; color: #52c41a; border: 1rpx solid #52c41a; padding: 2rpx 8rpx; border-radius: 6rpx; }
.loading, .empty { text-align: center; color: #999; padding: 120rpx 0; }
.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center;
  background: #fff; padding: 16rpx 24rpx calc(16rpx + constant(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.fav { width: 140rpx; text-align: center; font-size: 26rpx; }
.fav-on { color: #fa8c16; }
.fav-off { color: #999; }
.primary {
  flex: 1; background: #1976d2; color: #fff; border-radius: 44rpx;
  font-size: 30rpx; line-height: 80rpx; height: 80rpx;
}
.primary.applied { background: #b0bec5; }
</style>