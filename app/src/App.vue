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

<style>
/*每个页面公共css */
</style>
