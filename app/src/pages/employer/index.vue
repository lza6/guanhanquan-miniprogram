<template>
  <view class="employer-container">
    <!-- 自定义导航栏 -->
    <nav-bar title="雇主中心"></nav-bar>
    
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <image class="avatar" :src="userInfo && userInfo.avatar || '/static/img/default-avatar.png'" mode="aspectFill"></image>
        <view class="info">
          <view class="name">{{displayName}}</view>
          <view class="tag" v-if="certification">{{certification}}</view>
        </view>
        <view class="login-btn" v-if="!isLoggedIn" @click="login">登录/注册</view>
        <button class="edit-btn" v-else @click="editProfile">
          <uni-icons type="compose" size="14" color="#FFF"></uni-icons>
          <text>编辑资料</text>
        </button>
      </view>
      
      <!-- 钱包信息 -->
      <view class="wallet-info" v-if="isLoggedIn">
        <view class="wallet-item">
          <text class="amount">¥{{walletInfo.balance}}</text>
          <text class="label">余额</text>
        </view>
        <view class="divider"></view>
        <view class="wallet-item">
          <text class="amount">{{walletInfo.points}}</text>
          <text class="label">积分</text>
        </view>
        <view class="divider"></view>
        <view class="wallet-item">
          <text class="amount">{{walletInfo.expense}}</text>
          <text class="label">企业认证</text>
        </view>
      </view>
      
      <!-- 未登录提示 -->
      <view class="wallet-info not-login" v-else>
        <text class="login-tips">登录后查看您的资产信息</text>
      </view>
    </view>
    

    <!-- 功能列表 -->
    <view class="menu-card">
      <view class="menu-group">
        <view class="menu-title">我的招聘</view>
        <view class="menu-list">
          <view class="menu-item" @click="checkLogin('/pages/employer/jobPost')">
            <view class="icon">
              <uni-icons type="paperplane" size="22" color="#4CAF50"></uni-icons>
            </view>
            <view class="text">发布职位</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="checkLogin('/pages/employer/jobManage')">
            <view class="icon">
              <uni-icons type="staff" size="22" color="#FF9800"></uni-icons>
            </view>
            <view class="text">岗位管理</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="checkLogin('/pages/employer/applicants/list')">
            <view class="icon">
              <uni-icons type="checkbox-filled" size="22" color="#4CAF50"></uni-icons>
            </view>
            <view class="text">报名管理</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="checkLogin('/pages/employer/resume/index')">
            <view class="icon">
              <uni-icons type="contact" size="22" color="#9C27B0"></uni-icons>
            </view>
            <view class="text">工人简历库</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="checkLogin('/pages/category/categoryWorkers?id=&name=全部工种')">
            <view class="icon">
              <uni-icons type="search" size="22" color="#FF9800"></uni-icons>
            </view>
            <view class="text">按工种找工人</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="checkLogin('/pages/employer/applicants/list')">
            <view class="icon">
              <uni-icons type="personadd" size="22" color="#2196F3"></uni-icons>
            </view>
            <view class="text">应聘者管理</view>
            
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
        </view>
      </view>
      
      <view class="menu-group">
        <view class="menu-title">常用工具</view>
        <view class="menu-list"></view>
      </view>
      
      <view class="menu-group">
        <view class="menu-title">其他</view>
        <view class="menu-list">
          <view class="menu-item" @click="switchToWorker">
            <view class="icon">
              <uni-icons type="person" size="22" color="#1976D2"></uni-icons>
            </view>
            <view class="text">切换到工人端</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="navigateTo('/pages/mine/feedback')">
            <view class="icon">
              <uni-icons type="help" size="22" color="#607D8B"></uni-icons>
            </view>
            <view class="text">意见反馈</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
          <view class="menu-item" @click="navigateTo('/pages/mine/settings')">
            <view class="icon">
              <uni-icons type="gear" size="22" color="#607D8B"></uni-icons>
            </view>
            <view class="text">设置</view>
            <uni-icons type="right" size="16" color="#CCCCCC"></uni-icons>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 退出登录按钮 -->
    <view class="logout-btn" v-if="isLoggedIn" @click="handleLogout">退出登录</view>
    
    <!-- 身份切换按钮 -->
    <identity-switch></identity-switch>
    
    <!-- 底部导航栏 -->
    <employer-tabbar current-tab="my"></employer-tabbar>
  </view>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import IdentitySwitch from '@/components/identity-switch.vue'
import EmployerTabbar from '@/components/employer-tabbar.vue'
import api from '@/api/index.js'
import { getUser, setUser, clearAuth } from '@/utils/auth'

export default {
  components: { IdentitySwitch, EmployerTabbar },
  data() {
    return { localUser: null }
  },
  computed: {
    ...mapState(['userType', 'userInfo']),
    isLoggedIn() { return !!this.localUser },
    displayName() {
      const u = this.localUser || {}
      return u.companyName || u.nickname || '未登录'
    },
    certification() {
      if (!this.localUser) return ''
      return this.localUser.enterpriseVerified ? '企业已认证' : '企业未认证'
    },
    walletInfo() {
      const u = this.localUser || {}
      return {
        balance: u.balance || 0,
        points: u.points || 0,
        expense: u.enterpriseVerified ? '已认证' : '未认证'
      }
    }
  },
  onShow() {
    this.checkLoginStatus()
  },
  methods: {
    ...mapMutations(['setUserInfo', 'toggleUserType']),
    checkLoginStatus() {
      this.localUser = getUser()
      if (this.localUser) this.loadProfile()
    },
    async loadProfile() {
      try {
        const res = await api.getEmployerProfile()
        const merged = Object.assign({}, this.localUser, res.data, { userType: 'employer' })
        this.localUser = merged
        setUser(merged)
        this.setUserInfo(merged)
        this.toggleUserType('employer')
      } catch (e) {
        if (e && e.code === 403) {
          clearAuth()
          this.localUser = null
        }
      }
    },
    checkLogin(url) {
      if (this.isLoggedIn) {
        this.navigateTo(url)
        return
      }
      uni.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => { if (res.confirm) this.login() }
      })
    },
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (!res.confirm) return
          clearAuth()
          this.localUser = null
          this.setUserInfo(null)
          this.toggleUserType('')
          uni.reLaunch({ url: '/pages/login/login' })
        }
      })
    },
    login() {
      uni.navigateTo({ url: '/pages/login/login' })
    },
    navigateTo(url) {
      uni.navigateTo({ url })
    },
    switchToWorker() {
      uni.switchTab({ url: '/pages/mine/mine' })
    },
    editProfile() {
      uni.navigateTo({ url: '/pages/employer/certification' })
    }
  }
}
</script>

<style lang="scss">
.employer-container {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 120rpx;
  
  .user-card {
    background: linear-gradient(to right, #8BC34A, #4CAF50);
    padding: 30rpx;
    border-radius: 0 0 20rpx 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    
    .user-info {
      display: flex;
      align-items: center;
      margin-bottom: 30rpx;
      
      .avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        background-color: #FFFFFF;
        margin-right: 20rpx;
        border: 4rpx solid rgba(255, 255, 255, 0.5);
      }
      
      .info {
        flex: 1;
        
        .name {
          font-size: 34rpx;
          color: #FFFFFF;
          font-weight: bold;
          margin-bottom: 10rpx;
        }
        
        .tag {
          display: inline-block;
          font-size: 24rpx;
          color: #4CAF50;
          background-color: #FFFFFF;
          padding: 6rpx 20rpx;
          border-radius: 30rpx;
        }
      }
      
      .login-btn {
        padding: 10rpx 30rpx;
        background-color: rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
        border-radius: 30rpx;
        font-size: 28rpx;
      }

      .edit-btn {
        display: flex;
        align-items: center;
        padding: 10rpx 30rpx;
        background-color: rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
        border-radius: 30rpx;
        font-size: 28rpx;
        border: none;
        
        text {
          margin-left: 8rpx;
        }
      }
    }
    
    .wallet-info {
      display: flex;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 16rpx;
      padding: 20rpx 0;
      
      &.not-login {
        justify-content: center;
        padding: 30rpx 0;
        
        .login-tips {
          color: rgba(255, 255, 255, 0.8);
          font-size: 28rpx;
        }
      }
      
      .wallet-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        .amount {
          font-size: 32rpx;
          color: #FFFFFF;
          font-weight: bold;
          margin-bottom: 8rpx;
        }
        
        .label {
          font-size: 24rpx;
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .divider {
        width: 1rpx;
        height: 50rpx;
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }

  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    padding: 30rpx;
    margin-top: 20rpx;
  }

  .status-card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin: 0 20rpx 20rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

    .status-row {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;

      .status-item {
        width: 20%;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20rpx;

        .icon-box {
          width: 80rpx;
          height: 80rpx;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10rpx;

          &.blue { background-color: rgba(76, 175, 80, 0.1); }
          &.orange { background-color: rgba(255, 152, 0, 0.1); }
          &.green { background-color: rgba(76, 175, 80, 0.1); }
          &.purple { background-color: rgba(156, 39, 176, 0.1); }
          &.teal { background-color: rgba(0, 150, 136, 0.1); }
          &.red { background-color: rgba(229, 57, 53, 0.1); }
        }

        text {
          font-size: 24rpx;
          color: #666;
        }
      }
    }
  }
  
  .menu-card {
    background-color: #FFFFFF;
    padding: 0 30rpx;
    
    .menu-group {
      padding: 30rpx 0;
      border-bottom: 1rpx solid #EEEEEE;
      
      &:last-child {
        border-bottom: none;
      }
      
      .menu-title {
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 20rpx;
      }
      
      .menu-list {
        .menu-item {
          display: flex;
          align-items: center;
          padding: 24rpx 0;
          
          .icon {
            width: 44rpx;
            height: 44rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20rpx;
          }
          
          .text {
            flex: 1;
            font-size: 28rpx;
            color: #333;
          }
          
          .badge {
            font-size: 22rpx;
            color: #FFFFFF;
            background-color: #FF5722;
            padding: 4rpx 10rpx;
            border-radius: 20rpx;
            margin-right: 20rpx;
          }
        }
      }
    }
  }
  
  .logout-btn {
    margin: 40rpx 30rpx;
    background-color: #FFFFFF;
    height: 90rpx;
    line-height: 90rpx;
    text-align: center;
    border-radius: 45rpx;
    color: #FF5722;
    font-size: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  }

  .settings-btn {
    color: #FFFFFF;
    font-size: 40rpx;
  }
}
</style> 
