<script>
import { initCloud } from './api/cloud'
import { DEV_API_BASE } from './config'
import api from './api/index.js'

export default {
	onLaunch() {
		if (!DEV_API_BASE) {
			try {
				initCloud()
			} catch (e) {
				console.error('云开发初始化失败：', e.message)
			}
		}
		this.syncUser()
	},
	onShow() {},
	onHide() {},
	methods: {
		async syncUser() {
			try {
				const res = await api.getUserProfile()
				this.$store.commit('setUserInfo', res.data)
				uni.setStorageSync('ghq_user', res.data)
			} catch (e) {
				// 未登录或后端未就绪时静默失败，由登录页兜底
			}
		}
	}
}
</script>

<style lang="scss">
/* ColorUI 全局样式：导航栏、图标、按钮、卡片都依赖它 */
@import "colorui/main.css";
@import "colorui/icon.css";
@import "colorui/animation.css";

page {
  --primary-color: #1976D2;
  --success-color: #4CAF50;
  --warning-color: #FF9800;
  --danger-color: #FF5722;
  --info-color: #607D8B;

  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    'Segoe UI', Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei',
    sans-serif;
  background-color: #F5F5F5;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}
</style>
