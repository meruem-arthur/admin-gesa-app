const CLOUD_NAME    = 'df9ns044o'
const UPLOAD_PRESET = 'gesa-app'

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export async function uploadFile(file, folder = 'gesa') {
  // Use MIME type to determine resource type — docx/pptx must go via 'raw'
  const isDocument = DOCUMENT_TYPES.includes(file.type)
    || /\.(pdf|docx|doc|pptx|ppt)$/i.test(file.name)
  const resType = isDocument ? 'raw' : 'image'

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resType}/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Upload failed') }
  const data = await res.json()
  return data.secure_url
}

export async function uploadPhoto(file, folder = 'gesa/photos') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Upload failed') }
  const data = await res.json()
  return data.secure_url
}
