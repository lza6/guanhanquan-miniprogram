<template>
  <div class="page-card">
    <h3 class="page-title">首页轮播图</h3>
    <el-button type="primary" style="margin-bottom: 16px" @click="open()">新增</el-button>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column label="预览" width="160">
        <template #default="{ row }">
          <el-image :src="row.imageUrl" style="width: 120px; height: 48px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="140" />
      <el-table-column prop="link" label="跳转链接" min-width="180" show-overflow-tooltip />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="visible" :title="form.id ? '编辑轮播图' : '新增轮播图'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="图片地址">
          <el-input v-model="form.imageUrl" placeholder="云存储 fileID 或 https 地址" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" placeholder="/pages/... 或留空" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const rows = ref([])
const loading = ref(false)
const visible = ref(false)
const form = reactive({ id: '', imageUrl: '', title: '', link: '', sort: 0, enabled: true })

async function load() {
  loading.value = true
  try {
    rows.value = await api.banners()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function open(row) {
  Object.assign(form, { id: '', imageUrl: '', title: '', link: '', sort: 0, enabled: true })
  if (row) Object.assign(form, row)
  visible.value = true
}

async function save() {
  if (!form.imageUrl) {
    ElMessage.warning('请填写图片地址')
    return
  }
  try {
    await api.saveBanner({ ...form })
    visible.value = false
    ElMessage.success('已保存')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function remove(row) {
  await ElMessageBox.confirm('确认删除该轮播图？', '提示', { type: 'warning' })
  try {
    await api.deleteBanner(row._id)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>