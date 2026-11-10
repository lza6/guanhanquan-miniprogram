<template>
  <view class="publish">
    <cu-custom bgColor="bg-gradient-green">
      <block slot="content">发布招工</block>
    </cu-custom>

    <view class="card">
      <view class="section-title">基础信息</view>

      <view class="row">
        <text class="label required">工种</text>
        <picker :range="categoryNames" @change="onCategory">
          <view class="picker" :class="{ placeholder: !form.categoryId }">
            {{ categoryName || '请选择工种' }}
          </view>
        </picker>
      </view>

      <view class="row">
        <text class="label">岗位名称</text>
        <input class="input" v-model="form.title" :placeholder="categoryName || '默认与工种相同'" maxlength="20" />
      </view>

      <view class="row">
        <text class="label required">日薪</text>
        <input class="input" type="number" v-model="form.salary" placeholder="元/天，如 550" />
        <text class="unit">元/天</text>
      </view>

      <view class="row">
        <text class="label">工期</text>
        <input class="input" v-model="form.duration" placeholder="如：工期到年底 / 两个多月" maxlength="30" />
      </view>

      <view class="row">
        <text class="label required">工作地区</text>
        <input class="input" v-model="form.workArea" placeholder="如：新疆乌鲁木齐 / 沈阳苏家屯" maxlength="30" />
      </view>

      <view class="row">
        <text class="label">详细地址</text>
        <input class="input" v-model="form.workAddress" placeholder="选填，具体项目地址" maxlength="60" />
      </view>
    </view>

    <view class="card">
      <view class="section-title">岗位要求</view>

      <view class="row">
        <text class="label">证书</text>
        <picker :range="certOptions" @change="(e) => form.certificateReq = certOptions[e.detail.value]">
          <view class="picker" :class="{ placeholder: !form.certificateReq }">
            {{ form.certificateReq || '请选择' }}
          </view>
        </picker>
      </view>

      <view class="row">
        <text class="label">年龄</text>
        <input class="input" v-model="form.ageLimit" placeholder="如：55 岁以下 / 不超 55 虚岁" maxlength="20" />
      </view>

      <view class="row">
        <text class="label">技术</text>
        <input class="input" v-model="form.techReq" placeholder="如：能包口 / 焊缝探伤" maxlength="40" />
      </view>

      <view class="row column">
        <text class="label">其他</text>
        <textarea class="textarea" v-model="form.otherReq" maxlength="200"
          placeholder="如：无犯罪记录、带体检报告、事多的不要" />
      </view>
    </view>

    <view class="card">
      <view class="section-title">待遇</view>

      <view class="row">
        <text class="label">发薪</text>
        <picker :range="payOptions" @change="(e) => form.payType = e.detail.value + 1">
          <view class="picker">{{ payOptions[form.payType - 1] }}</view>
        </picker>
      </view>

      <view class="row">
        <text class="label">食宿</text>
        <picker :range="accOptions" @change="(e) => form.accommodation = e.detail.value + 1">
          <view class="picker">{{ accOptions[form.accommodation - 1] }}</view>
        </picker>
      </view>

      <view class="row">
        <text class="label">路费</text>
        <picker :range="travelOptions" @change="(e) => form.travelReimburse = e.detail.value + 1">
          <view class="picker">{{ travelOptions[form.travelReimburse - 1] }}</view>
        </picker>
      </view>

      <view class="row">
        <text class="label">其他福利</text>
        <input class="input" v-model="form.otherBenefits" placeholder="选填" maxlength="40" />
      </view>
    </view>

    <view class="card">
      <view class="section-title">联系方式</view>

      <view class="row">
        <text class="label required">联系人</text>
        <input class="input" v-model="form.contactName" placeholder="如：张 / 李老板" maxlength="10" />
      </view>

      <view class="row">
        <text class="label required">电话</text>
        <input class="input" type="number" v-model="form.contactPhone" maxlength="11" placeholder="11 位手机号" />
      </view>

      <view class="row">
        <text class="label">微信同号</text>
        <switch :checked="form.wechatSame" color="#1976d2" @change="(e) => form.wechatSame = e.detail.value" />
      </view>

      <view class="row">
        <text class="label">急招</text>
        <switch :checked="form.isUrgent" color="#e54d42" @change="(e) => form.isUrgent = e.detail.value" />
      </view>
    </view>

    <view class="tip-box">
      提交后进入人工审核，通过后才会展示。默认有效期 7 天，到期自动下架。
    </view>

    <view class="submit-bar">
      <button class="submit" :loading="submitting" @tap="submit">提交审核</button>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return {
      categories: [],
      submitting: false,
      certOptions: ['双证', '单证', '无证均可', '有证成手', '不限'],
      payOptions: ['压一付一', '月结', '完工结算', '公司直发', '面议'],
      accOptions: ['管吃住', '管住不管吃', '不管吃住', '面议'],
      travelOptions: ['报销往返', '报销单程', '不报销', '面议'],
      form: {
        categoryId: '',
        title: '',
        salary: '',
        duration: '',
        workArea: '',
        workAddress: '',
        certificateReq: '',
        ageLimit: '',
        techReq: '',
        otherReq: '',
        payType: 1,
        accommodation: 1,
        travelReimburse: 1,
        otherBenefits: '',
        contactName: '',
        contactPhone: '',
        wechatSame: false,
        isUrgent: false
      }
    }
  },
  computed: {
    categoryNames() {
      return this.categories.map((c) => c.name)
    },
    categoryName() {
      const c = this.categories.find((x) => String(x.id) === String(this.form.categoryId))
      return c ? c.name : ''
    }
  },
  onLoad() {
    this.loadCategories()
    this.prefillContact()
  },
  methods: {
    async loadCategories() {
      try {
        const res = await api.getCategories()
        this.categories = res.data || []
      } catch (e) {
        uni.showToast({ title: '工种加载失败', icon: 'none' })
      }
    },
    async prefillContact() {
      try {
        const res = await api.getUserProfile()
        const u = res.data
        if (u) {
          this.form.contactName = this.form.contactName || u.nickname || ''
          this.form.contactPhone = this.form.contactPhone || u.phone || ''
        }
      } catch (e) {}
    },
    onCategory(e) {
      const c = this.categories[Number(e.detail.value)]
      if (!c) return
      this.form.categoryId = c.id
      if (!this.form.title) this.form.title = c.name
    },
    validate() {
      const f = this.form
      if (!f.categoryId) return '请选择工种'
      if (!f.salary || Number(f.salary) <= 0) return '请填写日薪'
      if (!f.workArea) return '请填写工作地区'
      if (!f.contactName) return '请填写联系人'
      if (!/^1\d{10}$/.test(String(f.contactPhone))) return '请填写正确的手机号'
      return ''
    },
    async submit() {
      if (this.submitting) return
      const err = this.validate()
      if (err) {
        uni.showToast({ title: err, icon: 'none' })
        return
      }
      this.submitting = true
      try {
        const payload = Object.assign({}, this.form, {
          title: this.form.title || this.categoryName,
          salary: Number(this.form.salary),
          salaryUnit: 1
        })
        await api.publishJob(payload)
        uni.showToast({ title: '已提交审核', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1200)
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
.publish { min-height: 100vh; background: #f5f6f8; padding-bottom: 160rpx; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.row { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.row.column { flex-direction: column; align-items: flex-start; }
.label { width: 150rpx; color: #666; font-size: 28rpx; flex-shrink: 0; }
.label.required::after { content: ' *'; color: #e54d42; }
.input { flex: 1; font-size: 28rpx; height: 56rpx; }
.unit { font-size: 26rpx; color: #999; margin-left: 8rpx; }
.picker { font-size: 28rpx; color: #333; }
.picker.placeholder { color: #bbb; }
.textarea { width: 100%; height: 140rpx; font-size: 28rpx; margin-top: 12rpx; background: #f7f8fa; border-radius: 12rpx; padding: 20rpx; box-sizing: border-box; }
.tip-box { margin: 20rpx 24rpx; font-size: 24rpx; color: #999; line-height: 1.6; }
.submit-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 20rpx 24rpx calc(20rpx + constant(safe-area-inset-bottom)); box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.05); }
.submit { background: #1976d2; color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>