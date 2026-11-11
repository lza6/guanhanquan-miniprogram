<template>
  <view class="page">
    <cu-custom bgColor="bg-gradual-green" isBack><block slot="content">我的求职</block></cu-custom>

    <view v-if="form.reviewStatus === 0" class="banner">简历待平台审核，通过后招工方才看得到</view>
    <view v-else-if="form.reviewStatus === 2" class="banner danger">未通过审核：{{ form.rejectReason || '资料不完整' }}</view>

    <view class="card">
      <view class="row">
        <text class="label">求职状态</text>
        <switch :checked="form.status === 0" color="#1976d2" @change="onStatus" />
        <text class="hint">{{ form.status === 0 ? '招工方可以看到你' : '已关闭，招工方看不到' }}</text>
      </view>
    </view>

    <view class="card">
      <view class="section-title">基本信息</view>
      <view class="row"><text class="label">称呼</text><input class="input" v-model="form.name" placeholder="如：李师傅" /></view>
      <view class="row"><text class="label">电话</text><input class="input" type="number" maxlength="11" v-model="form.contactPhone" /></view>
      <view class="row"><text class="label">微信</text><input class="input" v-model="form.wechat" placeholder="选填" /></view>
      <view class="row"><text class="label">工作年限</text>
        <picker :range="years" @change="(e) => form.workExperience = years[e.detail.value]">
          <view class="picker">{{ form.workExperience || '请选择' }}</view>
        </picker>
      </view>
      <view class="row"><text class="label">证书</text>
        <picker :range="certs" @change="(e) => form.certificateInfo = certs[e.detail.value]">
          <view class="picker">{{ form.certificateInfo || '请选择' }}</view>
        </picker>
      </view>
      <view class="row column">
        <text class="label">证书照片</text>
        <view class="images">
          <view class="img-box" v-for="(img, i) in form.certificateImages" :key="i">
            <image :src="img" mode="aspectFill" @tap="previewCert(i)" />
            <text class="del" @tap="removeCert(i)">×</text>
          </view>
          <view class="img-add" v-if="form.certificateImages.length < 3" @tap="chooseCert">+</view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">技能</view>
      <view class="tags">
        <view v-for="t in jobTypeOptions" :key="t"
          :class="['tag', { active: form.jobTypes.includes(t) }]" @tap="toggleType(t)">{{ t }}</view>
      </view>
      <textarea class="textarea" v-model="form.techDescription" maxlength="200"
        placeholder="擅长什么材质、什么工艺，例如：氩电焊、不锈钢管道、能包口" />
    </view>

    <view class="card">
      <view class="section-title">求职意向</view>
      <view class="row"><text class="label">期望地区</text><input class="input" v-model="form.expectArea" placeholder="如：东北三省 / 沈阳" /></view>
      <view class="row"><text class="label">期望薪资</text><input class="input" v-model="form.expectSalary" placeholder="如：600-700/天" /></view>
      <view class="row"><text class="label">到岗时间</text>
        <picker :range="availables" @change="(e) => form.availableTime = availables[e.detail.value]">
          <view class="picker">{{ form.availableTime || '请选择' }}</view>
        </picker>
      </view>
    </view>

    <button class="submit" :loading="saving" @tap="save">保存简历</button>
    <button class="delete" @tap="deleteResume">删除简历</button>
  </view>
</template>

<script>
import api from '@/api/index.js'

export default {
  data() {
    return {
      saving: false,
      years: ['1 年以内', '1-3 年', '3-5 年', '5-8 年', '8 年以上'],
      certs: ['双证', '单证', '无证', '有证成手'],
      availables: ['随时到岗', '一周内', '半个月后', '面议'],
      jobTypeOptions: ['管工', '焊工', '普工', '铆工', '起重工', '电工', '技术员'],
      form: {
        name: '', contactPhone: '', wechat: '', workExperience: '', certificateInfo: '',
        certificateImages: [], jobTypes: [], techDescription: '', expectArea: '', expectSalary: '',
        availableTime: '', status: 0, reviewStatus: 1, rejectReason: ''
      }
    }
  },
  onLoad() { this.load() },
  methods: {
    async load() {
      try {
        const res = await api.getWorkerProfile()
        const d = res.data || {}
        this.form = Object.assign({}, this.form, {
          name: d.name || '',
          contactPhone: d.contactPhone || '',
          wechat: d.wechat || '',
          workExperience: d.workExperience || '',
          certificateInfo: d.certificateInfo || '',
          certificateImages: d.certificateImages || [],
          jobTypes: d.jobTypes || [],
          techDescription: d.techDescription || '',
          expectArea: d.expectArea || '',
          expectSalary: d.expectSalary || '',
          availableTime: d.availableTime || '',
          status: d.status === undefined ? 0 : d.status,
          reviewStatus: d.reviewStatus === undefined ? 1 : d.reviewStatus,
          rejectReason: d.rejectReason || ''
        })
      } catch (e) {}
    },
    onStatus(e) {
      this.form.status = e.detail.value ? 0 : 1
    },
    toggleType(t) {
      const i = this.form.jobTypes.indexOf(t)
      if (i >= 0) this.form.jobTypes.splice(i, 1)
      else this.form.jobTypes.push(t)
    },
    chooseCert() {
      uni.chooseImage({
        count: 3 - this.form.certificateImages.length,
        sizeType: ['compressed'],
        success: async (res) => {
          uni.showLoading({ title: '上传中' })
          try {
            for (const path of res.tempFilePaths) {
              const fileID = await api.uploadFile(path, 'certificate')
              this.form.certificateImages.push(fileID)
            }
          } catch (e) {
            uni.showToast({ title: '上传失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    previewCert(i) {
      uni.previewImage({ current: this.form.certificateImages[i], urls: this.form.certificateImages })
    },
    removeCert(i) {
      this.form.certificateImages.splice(i, 1)
    },
    async deleteResume() {
      uni.showModal({
        title: '删除简历',
        content: '删除后招工方将看不到你的简历，确认删除？',
        confirmColor: '#e54d42',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await api.deleteWorkerProfile()
            this.form = Object.assign({}, this.form, {
              name: '', jobTypes: [], certificateInfo: '', certificateImages: [],
              workExperience: '', techDescription: '', expectArea: '', expectSalary: '',
              availableTime: '', status: 1, reviewStatus: 1
            })
            uni.showToast({ title: '已删除', icon: 'success' })
          } catch (e) {}
        }
      })
    },
    async save() {
      if (!this.form.name) return uni.showToast({ title: '请填写称呼', icon: 'none' })
      if (!/^1\d{10}$/.test(String(this.form.contactPhone))) return uni.showToast({ title: '请填写正确手机号', icon: 'none' })
      if (!this.form.jobTypes.length) return uni.showToast({ title: '请至少选一个工种', icon: 'none' })
      this.saving = true
      try {
        await api.updateWorkerProfile(this.form)
        this.form.reviewStatus = 0
        this.form.rejectReason = ''
        uni.showToast({ title: '已保存，等待审核', icon: 'success' })
      } catch (e) {} finally { this.saving = false }
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.card { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 28rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 12rpx; }
.row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { width: 150rpx; color: #666; font-size: 28rpx; flex-shrink: 0; }
.input { flex: 1; font-size: 28rpx; }
.picker { font-size: 28rpx; color: #333; }
.hint { font-size: 22rpx; color: #999; margin-left: 12rpx; }
.tags { display: flex; flex-wrap: wrap; margin-bottom: 12rpx; }
.tag { padding: 10rpx 24rpx; margin: 0 12rpx 12rpx 0; border-radius: 30rpx; background: #f5f6f8; font-size: 26rpx; color: #666; }
.tag.active { background: #1976d2; color: #fff; }
.textarea { width: 100%; height: 160rpx; background: #f7f8fa; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; box-sizing: border-box; }
.submit { margin: 20rpx 24rpx 0; background: #1976d2; color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.delete { margin: 20rpx 24rpx; background: transparent; color: #e54d42; font-size: 28rpx; }
.banner { margin: 20rpx; padding: 18rpx 24rpx; border-radius: 12rpx; background: #fff7e6; color: #fa8c16; font-size: 24rpx; }
.banner.danger { background: #fff1f0; color: #e54d42; }
.images { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.img-box, .img-add { width: 140rpx; height: 140rpx; margin: 0 14rpx 14rpx 0; border-radius: 10rpx; overflow: hidden; position: relative; }
.img-box image { width: 100%; height: 100%; }
.img-add { border: 1rpx dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #bbb; }
.del { position: absolute; top: 0; right: 0; width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; background: rgba(0,0,0,.5); color: #fff; font-size: 26rpx; }
</style>