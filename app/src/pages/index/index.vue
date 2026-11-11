<template>
  <view class="index-container">
    <!-- 自定义导航栏 -->
    <cu-custom bgColor="bg-gradual-green" :isBack="false">
      <block slot="content">
        <text class="header-title">管焊圈</text>
      </block>
    </cu-custom>
    
    <!-- 搜索栏 -->
    <view class="search-box">
      <view class="search-bar" @tap="goToSearch">
        <picker mode="region" :value="region" @change="onRegionChange">
          <view class="location-btn">
            <text>{{ city || '区域' }}</text>
            <text class="cuIcon-unfold"></text>
          </view>
        </picker>
        <view class="search-form">
          <text class="cuIcon-search text-gray"></text>
          <text class="text-gray">您想找一份什么样的工作?</text>
        </view>
        <view class="search-btn">搜索</view>
      </view>
    </view>

    <!-- 轮播图 (招募广告) -->
    <view class="banner-wrapper" :style="{height: bannerHeight}">
      <swiper class="screen-swiper" 
              :indicator-dots="true"
              :indicator-color="'rgba(255, 255, 255, .3)'"
              :indicator-active-color="'#ffffff'"
              :autoplay="true" 
              :circular="true" 
              :interval="3000" 
              :duration="500">
        <swiper-item v-for="(item, index) in banners" :key="index" @tap="bannerTap(item)">
          <image v-if="item.imageUrl" :src="item.imageUrl" mode="aspectFill" class="swiper-image"></image>
          <view v-else class="promo-card">
            <text class="promo-title">{{ item.title || '招工找活上管焊圈' }}</text>
            <text class="promo-sub">管工 · 焊工 · 铆工 · 起重工</text>
            <text class="promo-tag">日薪直招 · 老板电话直连</text>
          </view>
        </swiper-item>
      </swiper>
    </view>
    
    <!-- 分类导航 -->
    <view class="category-section">
      <view class="category-grid">
        <view class="category-item" v-for="(item, index) in categories" :key="index" @tap="goToCategory(item)">
          <view class="icon-wrapper">
            <image v-if="item.icon" :src="item.icon" mode="aspectFit" class="category-icon"></image>
            <text v-else class="category-initial">{{ item.name.charAt(0) }}</text>
          </view>
          <text class="category-name">{{item.name}}</text>
        </view>
      </view>
    </view>
    
    <!-- 推广横幅 (可选) -->
    <view class="promo-banner" v-if="showPromoBanner">
      <image src="/static/img/default/shili.png" mode="widthFix"></image>
    </view>
    
    <!-- 岗位推荐分类标签 -->
    <view class="section-divider"></view>
    <view class="recommend-section">
      <view class="recommend-tabs">
        <view class="tab-item" :class="{active: currentTab === 'hot'}" @tap="switchTab('hot')">
          <text>热门推荐</text>
        </view>
        <view class="tab-item" :class="{active: currentTab === 'nearest'}" @tap="switchTab('nearest')">
          <text>离我最近</text>
        </view>
        <view class="tab-item" :class="{active: currentTab === 'latest'}" @tap="switchTab('latest')">
          <text>最新岗位</text>
        </view>
      </view>
      
      <!-- 热门推荐岗位 -->
      <view class="job-list-container" v-if="currentTab === 'hot'">
        <view class="job-list">
          <job-card v-for="(job, index) in recommendJobs" :key="index" :job="job"></job-card>
          <view class="more-jobs" @tap="gotoMoreJobs">查看更多岗位 <text class="cuIcon-right"></text></view>
        </view>
      </view>
      
      <!-- 离我最近岗位 -->
      <view class="job-list-container" v-if="currentTab === 'nearest'">
        <view class="job-list">
          <job-card v-for="(job, index) in nearestJobs" :key="index" :job="job"></job-card>
          <view class="more-jobs" @tap="gotoMoreJobs">查看更多岗位 <text class="cuIcon-right"></text></view>
        </view>
      </view>
      
      <!-- 最新岗位 -->
      <view class="job-list-container" v-if="currentTab === 'latest'">
        <view class="job-list">
          <job-card v-for="(job, index) in latestJobs" :key="index" :job="job"></job-card>
          <view class="more-jobs" @tap="gotoMoreJobs">查看更多岗位 <text class="cuIcon-right"></text></view>
        </view>
      </view>
    </view>
    
  </view>
</template>

<script>
import JobCard from '@/components/job-card.vue'
import API from '@/api/index.js'

export default {
  components: {
    JobCard
  },
  data() {
    return {
      currentTab: 'hot', // hot, nearest, latest
      banners: [],
      bannerHeight: 'auto',
      showPromoBanner: false,
      categories: [],
      city: '',
      region: [],
      points: 0,
      recommendJobs: [],
      nearestJobs: [],
      latestJobs: [],
      isLoading: false,
      location: null,
      pageSize: 20,
      currentPage: 1,
      hasMore: true
    }
  },
  onLoad() {
    this.getUserLocation()
    this.preloadBannerImage()
    this.fetchHomeData()
    this.loadPoints()
  },
  // 添加下拉刷新
  onPullDownRefresh() {
    this.refreshData()
  },
  // 添加触底加载更多
  onReachBottom() {
    if (this.hasMore && !this.isLoading) {
      this.loadMoreJobs()
    }
  },
  methods: {
    // 刷新数据
    async refreshData() {
      this.currentPage = 1
      this.hasMore = true
      await this.fetchHomeData()
      uni.stopPullDownRefresh()
    },
    
    // 加载更多工作
    async loadMoreJobs() {
      if (!this.hasMore || this.isLoading) return
      
      this.isLoading = true
      try {
        const newJobs = await this.fetchJobsByTab(this.currentTab, this.currentPage + 1)
        if (newJobs && newJobs.length > 0) {
          this.currentPage++
          switch (this.currentTab) {
            case 'hot':
              this.recommendJobs = [...this.recommendJobs, ...newJobs]
              break
            case 'nearest':
              this.nearestJobs = [...this.nearestJobs, ...newJobs]
              break
            case 'latest':
              this.latestJobs = [...this.latestJobs, ...newJobs]
              break
          }
        } else {
          this.hasMore = false
        }
      } catch (error) {
        console.error('加载更多工作失败', error)
        uni.showToast({
          title: '加载失败，请稍后再试',
          icon: 'none'
        })
      } finally {
        this.isLoading = false
      }
    },
	
	// 新增方法：性别英文转中文
	  formatGender(gender) {
	    const genderMap = {
	      'male': '男性',
	      'female': '女性',
	      'none': '无要求'
	    }
	    return genderMap[gender] || '无要求'
	  },

    // 根据标签获取工作列表
    async fetchJobsByTab(tab, page = 1) {
      try {
        let response
        switch (tab) {
          case 'hot':
            response = await API.getRecommendedJobs({ page, pageSize: this.pageSize, city: this.city || undefined })
            break
          case 'nearest':
            response = await API.getNearbyJobs({ 
              page, 
              pageSize: this.pageSize,
              city: this.city || undefined,
              latitude: this.location && this.location.latitude,
              longitude: this.location && this.location.longitude
            })
            break
          case 'latest':
            response = await API.getLatestJobs({ page, pageSize: this.pageSize, city: this.city || undefined })
            break
        }
        
        if (response && response.code === 0 && response.data) {
          const records = response.data.records || []
          return records.map((job) => Object.assign({}, job, { distance: job.distance }))
        }
        return []
      } catch (error) {
        console.error(`获取${tab}工作列表失败`, error)
        return []
      }
    },

    // 格式化日期
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}月${day}日`
    },

    // 获取首页所需的所有数据
    async fetchHomeData() {
      this.isLoading = true
      try {
        // 并行加载所有数据
        const [banners, categories, jobs] = await Promise.all([
          this.fetchBanners(),
          this.fetchCategories(),
          this.fetchJobsByTab(this.currentTab)
        ])
        
        // 设置数据
        if (banners) { this.banners = banners; this.preloadBannerImage() }
        if (categories) this.categories = categories
        if (jobs) {
          switch (this.currentTab) {
            case 'hot':
              this.recommendJobs = jobs
              break
            case 'nearest':
              this.nearestJobs = jobs
              break
            case 'latest':
              this.latestJobs = jobs
              break
          }
        }
      } catch (error) {
        console.error('获取首页数据失败', error)
        uni.showToast({
          title: '获取数据失败，请稍后再试',
          icon: 'none'
        })
      } finally {
        this.isLoading = false
      }
    },
    
    // 获取轮播图数据
    async fetchBanners() {
      try {
        const response = await API.getBanners()
        if (response && response.code === 0 && response && response.data) {
          this.banners = response.data
        } else {
          this.banners = []
        }
      } catch (error) {
        console.error('获取轮播图失败', error)
        this.banners = []
      }
    },

    
    // 获取分类数据
    async fetchCategories() {
      try {
        const response = await API.getCategories()
        if (response && response.code === 0 && response && response.data) {
          this.categories = response.data
        } else {
          this.categories = []
        }
      } catch (error) {
        console.error('获取分类失败', error)
        this.categories = []
      }
    },


    onRegionChange(e) {
      const picked = e.detail.value || []
      this.region = picked
      const raw = picked[1] || picked[0] || ''
      this.city = String(raw).replace(/[省市]$/g, '')
      this.recommendJobs = []
      this.nearestJobs = []
      this.latestJobs = []
      this.currentPage = 1
      this.hasMore = true
      this.fetchHomeData()
    },
    goBlacklist() {
      uni.navigateTo({ url: '/pages/blacklist/query' })
    },
    async loadPoints() {
      try { const r = await API.getWallet(); this.points = r.data.points } catch (e) {}
    },
    async goWallet() {
      uni.navigateTo({ url: '/pages/wallet/index' })
    },

    // 切换标签
    async switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      this.currentPage = 1
      this.hasMore = true
      
      try {
        const jobs = await this.fetchJobsByTab(tab)
        switch (tab) {
          case 'hot':
            this.recommendJobs = jobs
            break
          case 'nearest':
            this.nearestJobs = jobs
            break
          case 'latest':
            this.latestJobs = jobs
            break
        }
      } catch (error) {
        console.error('切换标签失败', error)
        uni.showToast({
          title: '获取数据失败，请稍后再试',
          icon: 'none'
        })
      }
    },

    // 轮播图点击事件
    bannerTap(item) {
      const url = item.link || item.linkUrl
      if (!url) return
      uni.navigateTo({ url })
    },

    // 跳转到分类页面
    goToCategory(category) {
        uni.navigateTo({
            url: `/pages/category/categoryJobs?id=${category.id}&name=${encodeURIComponent(category.name)}`
        })
    },

    // 查看更多工作
    gotoMoreJobs() {
      uni.switchTab({ url: '/pages/jobSearch/jobSearch' })
    },

    // 跳转到搜索页
    goToSearch() {
      uni.navigateTo({
        url: '/pages/jobSearch/jobSearch'
      })
    },

    // 预加载轮播图第一张图片以获取高度
    preloadBannerImage() {
      const windowWidth = uni.getSystemInfoSync().windowWidth
      const first = (this.banners && this.banners[0]) || null
      const hasImage = !!(first && first.imageUrl)
      // 有图按 516×145 原比例；无图走宣传卡，给足高度
      const h = hasImage ? windowWidth * (145 / 516) : Math.round(windowWidth * 0.5)
      this.bannerHeight = h + 'px'
    },
    
    // 获取用户位置
    getUserLocation() {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.location = {
            latitude: res.latitude,
            longitude: res.longitude
          }
          // 获取到位置后刷新附近的工作
          this.fetchNearbyJobs()
        },
        fail: (err) => {
          console.error('获取位置失败', err)
          uni.showToast({
            title: '获取位置失败，请检查定位权限',
            icon: 'none'
          })
        }
      })
    },
    
    // 获取附近工作
    async fetchNearbyJobs() {
      if (!this.location) return
      
      try {
        const params = {
          latitude: this.location.latitude,
          longitude: this.location.longitude,
          limit: 5
        }
        const res = await API.getNearbyJobs(params)
        const records = res && res.data && res.data.records ? res.data.records : []
        if (records.length) this.nearestJobs = records
      } catch (error) {
        console.error('获取附近工作失败', error)
      }
    },
  }
}
</script>

<style lang="scss">
.index-container {
  min-height: 100vh;
  background-color: #F6F7FB;
  padding-bottom: 120rpx;
  position: relative;
}

/* 标题样式 */
.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 搜索栏样式 */
.search-box {
  padding: 20rpx 30rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid rgba(0,0,0,0.05);
}

.search-bar {
  display: flex;
  align-items: center;
  
  .location-btn {
    display: flex;
    align-items: center;
    font-size: 28rpx;
    margin-right: 15rpx;
    color: #333;
    font-weight: 500;
    
    .cuIcon-unfold {
      font-size: 24rpx;
      margin-left: 4rpx;
    }
  }
  
  .search-form {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: #F6F7FB;
    height: 72rpx;
    padding: 0 24rpx;
    border-radius: 36rpx;
    font-size: 28rpx;
    
    .cuIcon-search {
      margin-right: 10rpx;
      font-size: 32rpx;
    }
  }
  
  .quick-row { display: flex; padding: 0 30rpx 20rpx; }
  .quick-chip { background: #fff; color: #1976d2; font-size: 24rpx; padding: 10rpx 24rpx; border-radius: 30rpx; margin-right: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.05); }
  .search-btn {
    width: 90rpx;
    text-align: center;
    color: #FFFFFF;
    font-size: 28rpx;
    background: linear-gradient(90deg, #6B7CFF, #8A5EFF);
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 36rpx;
    margin-left: 15rpx;
    font-weight: 500;
  }
}

/* 轮播图样式 */
.banner-wrapper {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

.screen-swiper {
  width: 100%;
  height: 100%;
  
  .swiper-image {
    width: 100%;
    display: block;
  }
}

/* 分类导航样式 */
.category-section {
  background-color: #FFFFFF;
  padding: 20rpx 0 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.03);
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx 20rpx;
}

.category-item {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15rpx 0;
  
  .icon-wrapper {
    width: 88rpx;
    height: 88rpx;
    background: #EAF3FF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
    transition: all 0.3s ease;
    
    .category-initial {
      font-size: 34rpx;
      color: #1976d2;
      font-weight: 700;
      line-height: 1;
    }
.category-icon {
      width: 60rpx;
      height: 60rpx;
    }
  }
  
  .category-name {
    font-size: 24rpx;
    color: #333333;
    font-weight: 500;
    margin-bottom: 4rpx;
  }

  .category-desc {
    font-size: 20rpx;
    color: #999999;
    width: 100%;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    padding: 0 10rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
  }

  &:active {
    .icon-wrapper {
      transform: scale(0.95);
      box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
    }
  }
}

/* 推广横幅样式 */
.promo-banner {
  margin: 0 0 20rpx 0;
  width: 100%;
  
  image {
    width: 100%;
    display: block;
  }
}

/* 分隔线 */
.section-divider {
  height: 20rpx;
  background-color: #F6F7FB;
}

/* 推荐岗位区域样式 */
.recommend-section {
  background-color: #FFFFFF;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.03);
}

.recommend-tabs {
  display: flex;
  justify-content: space-around;
  background-color: #FFFFFF;
  padding: 0;
  border-bottom: 1rpx solid rgba(0,0,0,0.05);
  overflow: hidden;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 25rpx 0;
    font-size: 30rpx;
    color: #666666;
    position: relative;
    
    &.active {
      color: #6B7CFF;
      font-weight: 600;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 30%;
        width: 40%;
        height: 6rpx;
        border-radius: 3rpx;
        background: linear-gradient(90deg, #6B7CFF, #8A5EFF);
      }
    }
  }
}

.job-list-container {
  background-color: #FFFFFF;
  padding: 20rpx 30rpx;
}

.job-list {
  display: flex;
  flex-direction: column;
}

.more-jobs {
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #6B7CFF;
  border-top: 1rpx solid rgba(0,0,0,0.05);
  margin-top: 20rpx;
}

/* 布局覆盖：分类四列、快捷入口不与轮播重叠 */
.category-grid { justify-content: flex-start; }
.category-item { width: 25% !important; margin-bottom: 24rpx; }
.category-item .icon-wrapper { width: 88rpx; height: 88rpx; background: #EAF3FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 10rpx; }
.category-item .category-name { font-size: 26rpx; color: #333; }
.quick-row { position: relative; z-index: 3; background: #F5F5F5; padding: 12rpx 24rpx 16rpx; display: flex; }
.banner-wrapper { margin-top: 8rpx; }
.swiper-image { width: 100%; height: 100%; }
.promo-card { width: 100%; height: 100%; background: linear-gradient(135deg, #1b4b7a 0%, #2a6aa8 60%, #3d8fd0 100%); display: flex; flex-direction: column; justify-content: center; padding: 0 48rpx; box-sizing: border-box; }
.promo-title { color: #fff; font-size: 44rpx; font-weight: 700; letter-spacing: 2rpx; }
.promo-sub { color: rgba(255,255,255,.85); font-size: 26rpx; margin-top: 12rpx; }
.promo-tag { color: #ffd08a; font-size: 24rpx; margin-top: 18rpx; }
</style> 