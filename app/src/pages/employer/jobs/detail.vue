<template>
  <view class="detail-container">
    <!-- 自定义导航栏 -->
	<cu-custom bgColor="bg-gradual-green" isBack>
	  <block slot="content">{{ pageTitle }}</block>
	</cu-custom>
    
    <!-- 菜单项 -->
    <scroll-view scroll-x class="bg-white nav solid-bottom">
      <view class="flex text-center">
        <view class="cu-item flex-sub" :class="currentStatus === 0 ? 'text-blue cur' : ''" @tap="changeStatus(0)">待审核</view>
        <view class="cu-item flex-sub" :class="currentStatus === 1 ? 'text-blue cur' : ''" @tap="changeStatus(1)">招聘中</view>
        <view class="cu-item flex-sub" :class="currentStatus === 2 ? 'text-blue cur' : ''" @tap="changeStatus(2)">已暂停</view>
        <view class="cu-item flex-sub" :class="currentStatus === 3 ? 'text-blue cur' : ''" @tap="changeStatus(3)">已过期</view>
        <view class="cu-item flex-sub" :class="currentStatus === 4 ? 'text-blue cur' : ''" @tap="changeStatus(4)">已驳回</view>
      </view>
    </scroll-view>
    
    <!-- 空状态提示 -->
    <view class="empty-state" v-if="jobList.length === 0">
      <image src="/static/img/empty-task.png" mode="aspectFit"></image>
      <view class="empty-text">没有更多数据了</view>
    </view>
    
    <!-- 任务列表 -->
    <view class="job-list" v-else>
      <view class="job-item" v-for="(job, index) in jobList" :key="index" @tap="goToDetail(job)">
        <!-- 岗位信息卡片 -->
        <view class="job-card">
          <!-- 卡片头部信息 -->
          <view class="job-header">
            <view class="time-range">{{ job.timeRange }}</view>
            <view class="salary">{{ job.salary }}</view>
          </view>
          
          <!-- 岗位详情 -->
          <view class="job-detail">
            <view class="job-title">{{ job.title }}</view>
            <view class="job-tag-list">
              <view class="job-tag" v-if="job.requiredCount">招{{ job.requiredCount }}人</view>
              <view class="job-tag" v-if="job.gender !== 'none'">{{ job.gender === 'male' ? '只要男性' : '只要女性' }}</view>
              <view class="job-tag">{{ job.jobType }}</view>
            </view>
          </view>
          
          <!-- 岗位信息 -->
          <view class="job-info">
            <view class="info-item">
              <text class="label">工作时间:</text>
              <text class="value">{{ job.timeRange }}</text>
            </view>
            <view class="info-item">
              <text class="label">工作地址:</text>
              <text class="value">{{ job.address }}</text>
            </view>
            <view class="info-item" v-if="job.content">
              <text class="label">工作内容:</text>
              <text class="value">{{ job.content }}</text>
            </view>
          </view>
        </view>
          
        <!-- 底部按钮 -->
        <view class="job-actions">
          <view class="action-btn share" @tap.stop="shareJob(job)">
            <text class="cuIcon-share"></text>
            <text>分享</text>
          </view>
          <view class="action-btn status-update" @tap.stop="updateStatus(job)">
            {{ getActionText(job.status) }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/api/index.js'
import { salaryText } from '@/utils/job'
export default {
  data() {
    return {
      type: '', // 页面类型: recruiting, reviewing, selecting, interviewing, completed
      currentStatus: 1,
      jobList: [],
    }
  },
  computed: {
    pageTitle() {
      const titleMap = {
        'recruiting': '正在招工',
        'reviewing': '审核中',
        'selecting': '待选人',
        'interviewing': '待面试',
        'completed': '已完成'
      }
      return titleMap[this.type] || '岗位详情'
    }
  },
  onLoad(options) {
    const map = { recruiting: 1, reviewing: 0, completed: 2 }
    if (options.type) {
      this.type = options.type
      if (map[options.type] !== undefined) this.currentStatus = map[options.type]
    }
    this.loadJobList()
  },
  methods: {
    // 加载岗位列表
    async loadJobList() {
      try {
        const res = await api.getEmployerJobs({
          page: 1,
          pageSize: 50,
          status: this.currentStatus
        })
        this.jobList = (res.data.records || []).map((j) => ({
          id: j.id,
          title: j.title,
          jobType: j.jobType,
          salary: salaryText(j),
          timeRange: j.duration || '',
          address: j.workArea || '',
          content: '',
          gender: '',
          requiredCount: '',
          status: j.status
        }))
      } catch (e) {
        this.jobList = []
      }
    },

    // 切换状态标签
    changeStatus(status) {
      this.currentStatus = status
      this.loadJobList()
    },
    
    // 查看详情
    goToDetail(job) {
      uni.navigateTo({
        url: `/pages/jobDetail/jobDetail?id=${job.id}`
      })
    },
    
    // 分享岗位
    shareJob(job) {
      uni.showToast({
        title: '分享功能开发中',
        icon: 'none'
      })
    },
    
    // 更新岗位状态
    updateStatus(job) {
      uni.navigateTo({ url: '/pages/employer/jobManage' })
    },
    
    // 获取操作按钮文字
    getActionText(status) {
      const actionMap = {
        'pending': '确认接单',
        'accepted': '开始工作',
        'ongoing': '完成工作',
        'completed': '评价服务',
        'canceled': '重新发布'
      }
      return actionMap[status] || '操作'
    }
  }
}
</script>

<style lang="scss">
.detail-container {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 120rpx;
  padding-top: 90rpx;
  
  .nav {
    background-color: #FFFFFF;
    height: 90rpx;
    white-space: nowrap;
    
    .cu-item {
      height: 90rpx;
      line-height: 90rpx;
      position: relative;
      
      &.cur::after {
        content: "";
        width: 40rpx;
        height: 6rpx;
        background-color: currentColor;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        border-radius: 10rpx;
      }
    }
  }
  
  .empty-state {
    padding: 100rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    image {
      width: 200rpx;
      height: 200rpx;
      margin-bottom: 30rpx;
    }
    
    .empty-text {
      font-size: 28rpx;
      color: #999999;
    }
  }
  
  .job-list {
    padding: 20rpx;
    
    .job-item {
      margin-bottom: 30rpx;
      border-radius: 12rpx;
      overflow: hidden;
      background-color: #FFFFFF;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
      
      .job-card {
        padding: 30rpx;
        
        .job-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20rpx;
          
          .time-range {
            color: #666666;
            font-size: 24rpx;
          }
          
          .salary {
            color: #FF9800;
            font-weight: bold;
            font-size: 32rpx;
          }
        }
        
        .job-detail {
          margin-bottom: 20rpx;
          
          .job-title {
            font-size: 36rpx;
            font-weight: bold;
            color: #333333;
            margin-bottom: 15rpx;
          }
          
          .job-tag-list {
            display: flex;
            flex-wrap: wrap;
            
            .job-tag {
              background-color: #F2F7FF;
              color: #4169E1;
              font-size: 24rpx;
              padding: 8rpx 16rpx;
              border-radius: 20rpx;
              margin-right: 16rpx;
              margin-bottom: 10rpx;
            }
          }
        }
        
        .job-info {
          background-color: #F9F9F9;
          padding: 20rpx;
          border-radius: 10rpx;
          
          .info-item {
            display: flex;
            margin-bottom: 10rpx;
            
            .label {
              width: 160rpx;
              color: #999999;
              font-size: 28rpx;
            }
            
            .value {
              flex: 1;
              color: #333333;
              font-size: 28rpx;
            }
          }
        }
      }
      
      .job-actions {
        display: flex;
        border-top: 1rpx solid #EEEEEE;
        
        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100rpx;
          font-size: 28rpx;
          
          &.share {
            border-right: 1rpx solid #EEEEEE;
            color: #999999;
            
            .cuIcon-share {
              margin-right: 10rpx;
            }
          }
          
          &.status-update {
            color: #4169E1;
            font-weight: bold;
          }
        }
      }
    }
  }
}
</style> 