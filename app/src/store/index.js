import { createStore } from 'vuex'

export default createStore({
  state: {
    userInfo: null,
    userType: 'employee', // employee（工人）/ employer（招工方）
    hasNewMessage: false,
    location: {
      longitude: 0,
      latitude: 0,
      address: '沈阳市',
      district: '苏家屯区'
    }
  },
  mutations: {
    setUserInfo(state, userInfo) {
      state.userInfo = userInfo
    },
    toggleUserType(state, type) {
      state.userType = type
    },
    setUserType(state, type) {
      state.userType = type
    },
    setMessageStatus(state, status) {
      state.hasNewMessage = status
    },
    setLocation(state, location) {
      state.location = location
    }
  },
  actions: {
    getUserLocation({ commit }) {
      return new Promise((resolve, reject) => {
        uni.getLocation({
          type: 'gcj02',
          success(res) {
            commit('setLocation', {
              longitude: res.longitude,
              latitude: res.latitude,
              address: '',
              district: ''
            })
            resolve(res)
          },
          fail(err) {
            reject(err)
          }
        })
      })
    }
  }
})