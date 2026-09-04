import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MuscleGroup } from '../types'
import MuscleDiagram from '../components/MuscleDiagram'

export default function ExerciseForm() {
  const { id } = useParams() // если есть id — режим редактирования
  const navigate = useNavigate()
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [muscleGroupId, setMuscleGroupId] = useState('')
  const [equipment, setEquipment] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState<'upload' | 'youtube'>('youtube')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('muscle_groups').select('*').order('name').then(({ data }) => {
      setMuscleGroups(data ?? [])
    })

    if (id) {
      supabase.from('exercises').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setName(data.name)
          setDescription(data.description ?? '')
          setMuscleGroupId(data.muscle_group_id ?? '')
          setEquipment(data.equipment ?? '')
          setVideoUrl(data.video_url ?? '')
          setVideoSource(data.video_source ?? 'youtube')
        }
      })
    }
  }, [id])

  const activeGroup = muscleGroups.find((g) => g.id === muscleGroupId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setSaving(false)
      return
    }

    let image_url: string | undefined
    let video_url = videoSource === 'youtube' ? videoUrl : undefined

    if (imageFile) {
      const path = `${userId}/${Date.now()}-${imageFile.name}`
      const { data, error } = await supabase.storage.from('exercise-media').upload(path, imageFile)
      if (!error && data) {
        image_url = supabase.storage.from('exercise-media').getPublicUrl(data.path).data.publicUrl
      }
    }

    if (videoSource === 'upload' && videoFile) {
      const path = `${userId}/${Date.now()}-${videoFile.name}`
      const { data, error } = await supabase.storage.from('exercise-media').upload(path, videoFile)
      if (!error && data) {
        video_url = supabase.storage.from('exercise-media').getPublicUrl(data.path).data.publicUrl
      }
    }

    const payload = {
      user_id: userId,
      name,
      description,
      muscle_group_id: muscleGroupId || null,
      equipment,
      video_source: videoSource,
      ...(image_url ? { image_url } : {}),
      ...(video_url ? { video_url } : {}),
    }

    if (id) {
      await supabase.from('exercises').update(payload).eq('id', id)
    } else {
      await supabase.from('exercises').insert(payload)
    }

    setSaving(false)
    navigate('/exercises')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">
        {id ? 'Редактировать упражнение' : 'Новое упражнение'}
      </h1>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div>
          <label className="block text-sm mb-1">Название</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Группа мышц</label>
          <select
            value={muscleGroupId}
            onChange={(e) => setMuscleGroupId(e.target.value)}
            className="border border-line rounded-sm px-3 py-2 bg-surface w-full mb-3"
          >
            <option value="">— выбрать —</option>
            {muscleGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {/* Схема тела наглядно показывает выбранную группу (спереди и сзади) */}
          <MuscleDiagram
            className="w-full max-w-xs mx-auto"
            activeRegionIds={activeGroup?.svg_region_ids ?? []}
            activeColor={activeGroup?.color ?? '#DCDFD9'}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Инвентарь (необязательно)</label>
          <input
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="напр. гантели, коврик, без инвентаря"
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Фото упражнения</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Видео</label>
          <div className="flex gap-4 mb-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={videoSource === 'youtube'}
                onChange={() => setVideoSource('youtube')}
              />
              Ссылка (YouTube)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={videoSource === 'upload'}
                onChange={() => setVideoSource('upload')}
              />
              Загрузить файл
            </label>
          </div>
          {videoSource === 'youtube' ? (
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full border border-line rounded-sm px-3 py-2 bg-surface"
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="justify-self-start bg-ink text-white px-5 py-2 rounded-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
