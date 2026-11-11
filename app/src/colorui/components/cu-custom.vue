<template>
	<view>
		<view class="cu-custom" :style="[{height:CustomBar + 'px'}]">
			<view class="cu-bar fixed" :style="style" :class="[bgImage!=''?'none-bg text-white bg-img':'',bgColor]">
				<view class="action" @tap="BackPage" v-if="isBack">
					<text class="cuIcon-back"></text>
					<slot name="backText"></slot>
				</view>
				<view class="content" :style="[{top: Math.max(20, StatusBar) + 'px'}]">
					<slot name="content"></slot>
				</view>
				<slot name="right"></slot>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			let statusBar = 20
			let customBar = 64
			try {
				const sys = uni.getSystemInfoSync() || {}
				statusBar = sys.statusBarHeight || 20
				// #ifdef MP-WEIXIN
				if (uni.getMenuButtonBoundingClientRect) {
					const menu = uni.getMenuButtonBoundingClientRect()
					if (menu && menu.bottom) customBar = menu.bottom + menu.top - statusBar
				}
				// #endif
				if (!customBar || customBar <= statusBar) customBar = statusBar + 44
			} catch (e) {}
			return { StatusBar: statusBar, CustomBar: customBar }
		},
		name: 'cu-custom',
		computed: {
			style() {
				// 状态栏高度兜底：环境返回 0 时按 20px 处理，避免标题贴顶
				var StatusBar = Math.max(20, Number(this.StatusBar) || 0);
				var CustomBar = Math.max(StatusBar + 44, Number(this.CustomBar) || 0);
				var bgImage = this.bgImage;
				var style = `height:${CustomBar}px;padding-top:${StatusBar}px;`;
				if (this.bgImage) {
					style = `${style}background-image:url(${bgImage});`;
				}
				return style
			}
		},
		props: {
			bgColor: {
				type: String,
				default: ''
			},
			isBack: {
				type: [Boolean, String],
				default: false
			},
			bgImage: {
				type: String,
				default: ''
			},
		},
		methods: {
			BackPage() {
				uni.navigateBack({
					delta: 1
				});
			}
		}
	}
</script>

<style>

</style> 