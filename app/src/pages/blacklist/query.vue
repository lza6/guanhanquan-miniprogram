<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green">
      <block slot="content">黑老板查询</block>
    </cu-custom>

    <view class="card">
      <view class="tip">输入老板手机号，查看是否被工人举报过。仅展示平台核实过的记录。</view>
      <view class="search-row">
        <input class="phone-input" type="number" maxlength="11" v-model="phone" placeholder="请输入 11 位手机号" />
        <button class="search-btn" :loading="loading" @tap="query">查询</button>
      </view>
    </view>

    <view class="card result" v-if="result">
      <view v-if="result.count === 0" class="safe">
        <text class="safe-title">暂无记录</text>
        <text class="safe-desc">该号码没有被核实的举报记录，但仍建议先电话确认工地与工钱。</text>
      </view>
      <view v-else>
        <view class="danger-title">该号码有 {{ result.count }} 条核实记录</view>
        <view class="reason-list">
          <view class="reason-item" v-for="(r, i) in result.reasons" :key="i">
            <text class="reason-name">{{ r.name }}</text>
            <text class="reason-count">{{ r.count }} 次</text>
          </view>
        </view>
        <view class="record" v-for="(rec, i) in result.records" :key="i">
          <view class="record-head">
            <text class="record-type">{{ rec.reasonName }}</text>
            <text class="record-time">{{ formatDate(rec.createdAt) }}</text>
          </view>
          <text class="record-detail">{{ rec.detail }}</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">我要举报</view>
      <view class="form-row">
        <text class="label">号码</text>
        <input class="input" type="number" maxlength="11" v-model="form.bossPhone" placeholder="老板手机号" />
      </view>
      <view class="form-row">
        <text class="label">称呼</text>
        <input class="input" v-model="form.bossName" placeholder="如：张老板（可不填）" />
      </view>
      <view class="form-row">
        <text class="label">原因</text>
        <picker :range="reasonNames" @change="onReasonChange">
          <view class="picker">{{ reasonNames[form.reasonIndex] }}</view>
        </picker>
      </view>
      <view class="form-row column">
        <text class="label">说明</text>
        <textarea class="textarea" v-model="form.reasonDetail" maxlength="500"
          placeholder="写清楚时间、地点、欠了多少钱、对方怎么答复（至少 10 个字，便于核实）" />
      </view>
      <button class="submit" :loading="submitting" @tap="submit">提交举报</button>
      <view class="notice">举报需人工核实，恶意举报会被封号。核实通过后其他工人才能看到。</view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return {
      phone: '',
      loading: false,
      result: null,
      submitting: false,
      reasonNames: ['欠薪/拖薪', '放鸽子（到现场没活）', '虚假信息（待遇不符）', '态度恶劣/克扣工资', '其他违规'],
      form: { bossPhone: '', bossName: '', reasonIndex: 0, reasonDetail: '' }
    }
  },
  onLoad(options) {
    if (options.phone) this.phone = options.phone
  },
  methods: {
    formatDate(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    },
    async query() {
      const phone = String(this.phone || '').trim()
      if (!/^1\d{10}$/.test(phone)) {
        uni.showToast({ title: '请输入 11 位手机号', icon: 'none' })
        return
      }
      this.loading = true
      try {
        const res = await api.queryBlacklist(phone)
        this.result = res.data
        this.form.bossPhone = phone
      } catch (e) {
        this.result = null
      } finally {
        this.loading = false
      }
    },
    onReasonChange(e) {
      this.form.reasonIndex = Number(e.detail.value)
    },
    async submit() {
      if (!/^1\d{10}$/.test(String(this.form.bossPhone))) {
        uni.showToast({ title: '请填写正确手机号', icon: 'none' })
        return
      }
      if (String(this.form.reasonDetail).trim().length < 10) {
        uni.showToast({ title: '说明至少 10 个字', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await api.submitBlacklist({
          bossPhone: this.form.bossPhone,
          bossName: this.form.bossName,
          reasonType: this.form.reasonIndex + 1,
          reasonDetail: this.form.reasonDetail
        })
        uni.showToast({ title: '已提交，等待核实', icon: 'success' })
        this.form.reasonDetail = ''
      } catch (e) {
        // 请求层已提示
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.tip { font-size: 24rpx; color: #999; line-height: 1.6; margin-bottom: 20rpx; }
.search-row { display: flex; align-items: center; }
.phone-input { flex: 1; height: 80rpx; background: #f5f6f8; border-radius: 40rpx; padding: 0 28rpx; font-size: 30rpx; }
.search-btn { margin-left: 16rpx; background: #1976d2; color: #fff; font-size: 28rpx; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; padding: 0 32rpx; }
.safe-title { display: block; font-size: 32rpx; color: #52c41a; font-weight: 600; margin-bottom: 12rpx; }
.safe-desc { font-size: 26rpx; color: #888; line-height: 1.6; }
.danger-title { font-size: 32rpx; color: #e54d42; font-weight: 600; margin-bottom: 16rpx; }
.reason-list { display: flex; flex-wrap: wrap; margin-bottom: 16rpx; }
.reason-item { background: #fff1f0; border-radius: 8rpx; padding: 8rpx 16rpx; margin: 0 12rpx 12rpx 0; }
.reason-name { font-size: 24rpx; color: #e54d42; }
.reason-count { font-size: 22rpx; color: #e54d42; margin-left: 8rpx; }
.record { border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; margin-top: 16rpx; }
.record-head { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.record-type { font-size: 26rpx; color: #333; font-weight: 600; }
.record-time { font-size: 22rpx; color: #999; }
.record-detail { font-size: 26rpx; color: #666; line-height: 1.6; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.form-row { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.form-row.column { flex-direction: column; align-items: flex-start; }
.label { width: 110rpx; color: #999; font-size: 28rpx; flex-shrink: 0; }
.input { flex: 1; font-size: 28rpx; height: 56rpx; }
.picker { font-size: 28rpx; color: #333; }
.textarea { width: 100%; height: 180rpx; font-size: 28rpx; margin-top: 12rpx; background: #f7f8fa; border-radius: 12rpx; padding: 20rpx; box-sizing: border-box; }
.submit { margin-top: 28rpx; background: #e54d42; color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.notice { font-size: 22rpx; color: #999; margin-top: 16rpx; line-height: 1.6; }
</style>