import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchExercise, syncExerciseRelations } from '../lib/exercises'
import { Category, MuscleGroup, Tag } from '../types'
import MuscleDiagram from '../components/MuscleDiagram'
import ImagePositioner, { ImagePositionerHandle } from '../components/ImagePositioner'

export default function ExerciseForm() {
  const { id } = useParams() // если есть id — режим редактирования
  const navigate = useNavigate()

  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [equipment, setEquipment] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState<'upload' | 'youtube'>('youtube')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const positionerRef = useRef<ImagePositionerHandle>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  const [selectedMuscleGroupIds, setSelectedMuscleGroupIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadOptions()
    if (id) loadExercise(id)
  }, [id])

  async function loadOptions() {
    const [{ data: mg }, { data: cats }, { data: tgs }] = await Promise.all([
      supabase.from('muscle_groups').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('tags').select('*').order('name'),
    ])
    setMuscleGroups(mg ?? [])
    setCategories(cats ?? [])
    setTags(tgs ?? [])
  }

  async function loadExercise(exerciseId: string) {
    const ex = await fetchExercise(exerciseId)
    if (!ex) return
    setName(ex.name)
    setDescription(ex.description ?? '')
    setEquipment(ex.equipment ?? '')
    setVideoUrl(ex.video_url ?? '')
    setVideoSource(ex.video_source ?? 'youtube')
    setExistingImageUrl(ex.image_url ?? null)
    setSelectedMuscleGroupIds(ex.muscleGroups.map((g) => g.id))
    setSelectedCategoryIds(ex.categories.map((c) => c.id))
    setSelectedTagIds(ex.tags.map((t) => t.id))
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  async function addCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    const { data, error } = await supabase.from('categories').insert({ name: trimmed }).select().single()
    if (!error && data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCategoryIds((prev) => [...prev, data.id])
    }
    setNewCategoryName('')
  }

  async function addTag() {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    const { data, error } = await supabase.from('tags').insert({ name: trimmed }).select().single()
    if (!error && data) {
      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedTagIds((prev) => [...prev, data.id])
    }
    setNewTagName('')
  }

  // Объединённые зоны подсветки на диаграмме тела по всем выбранным группам
  const activeGroups = muscleGroups
    .filter((g) => selectedMuscleGroupIds.includes(g.id))
    .map((g) => ({ svgRegionIds: g.svg_region_ids, color: g.color }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setSaving(false)
      setSaveError('Не удалось определить пользователя — попробуйте войти заново.')
      return
    }

    let image_url: string | undefined
    let video_url = videoSource === 'youtube' ? videoUrl : undefined

    if (imageFile) {
      const croppedFile = (await positionerRef.current?.getCroppedFile()) ?? imageFile
      const path = `${userId}/${Date.now()}-${croppedFile.name}`
      const { data, error } = await supabase.storage.from('exercise-media').upload(path, croppedFile)
      if (error) {
        setSaving(false)
        setSaveError(`Не удалось загрузить фото: ${error.message}`)
        return
      }
      image_url = supabase.storage.from('exercise-media').getPublicUrl(data.path).data.publicUrl
    }

    if (videoSource === 'upload' && videoFile) {
      const path = `${userId}/${Date.now()}-${videoFile.name}`
      const { data, error } = await supabase.storage.from('exercise-media').upload(path, videoFile)
      if (error) {
        setSaving(false)
        setSaveError(`Не удалось загрузить видео: ${error.message}`)
        return
      }
      video_url = supabase.storage.from('exercise-media').getPublicUrl(data.path).data.publicUrl
    }

    const payload = {
      user_id: userId,
      name,
      description,
      equipment,
      video_source: videoSource,
      ...(image_url ? { image_url } : {}),
      ...(video_url !== undefined ? { video_url } : {}),
    }

    let exerciseId = id
    let saveErr

    if (id) {
      ;({ error: saveErr } = await supabase.from('exercises').update(payload).eq('id', id))
    } else {
      const { data, error } = await supabase.from('exercises').insert(payload).select().single()
      saveErr = error
      exerciseId = data?.id
    }

    if (saveErr || !exerciseId) {
      setSaving(false)
      setSaveError(`Не удалось сохранить упражнение: ${saveErr?.message ?? 'неизвестная ошибка'}`)
      return
    }

    await syncExerciseRelations(exerciseId, selectedMuscleGroupIds, selectedCategoryIds, selectedTagIds)

    setSaving(false)
    navigate('/exercises')
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm('Удалить это упражнение? Оно также пропадёт из всех программ, где использовалось. Отменить нельзя.')) return
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error) {
      setSaveError(`Не удалось удалить упражнение: ${error.message}`)
      return
    }
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
          <label className="block text-sm mb-2">Группы мышц (можно несколько)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {muscleGroups.map((g) => {
              const active = selectedMuscleGroupIds.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(selectedMuscleGroupIds, setSelectedMuscleGroupIds, g.id)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={
                    active
                      ? { background: g.color, borderColor: g.color, color: '#1A1D1B' }
                      : { borderColor: '#DCDFD9', color: '#6B7169' }
                  }
                >
                  {g.name}
                </button>
              )
            })}
          </div>
          <MuscleDiagram
            className="w-full max-w-xs mx-auto"
            activeGroups={activeGroups}
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Категории (можно несколько)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {categories.map((c) => {
              const active = selectedCategoryIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(selectedCategoryIds, setSelectedCategoryIds, c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    active ? 'bg-accent border-accent text-ink' : 'border-line text-muted'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Новая категория"
              className="border border-line rounded-sm px-2 py-1 text-sm bg-surface flex-1"
            />
            <button
              type="button"
              onClick={addCategory}
              className="text-xs px-3 py-1.5 rounded-sm border border-line hover:bg-surface"
            >
              + Добавить
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Теги (можно несколько)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((t) => {
              const active = selectedTagIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(selectedTagIds, setSelectedTagIds, t.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    active ? 'bg-ink border-ink text-white' : 'border-line text-muted'
                  }`}
                >
                  #{t.name}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Новый тег"
              className="border border-line rounded-sm px-2 py-1 text-sm bg-surface flex-1"
            />
            <button
              type="button"
              onClick={addTag}
              className="text-xs px-3 py-1.5 rounded-sm border border-line hover:bg-surface"
            >
              + Добавить
            </button>
          </div>
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
          {imageFile ? (
            <div className="mb-2 max-w-xs">
              <ImagePositioner ref={positionerRef} file={imageFile} />
            </div>
          ) : (
            existingImageUrl && (
              <img src={existingImageUrl} alt="" className="w-24 h-24 object-cover rounded-sm border border-line mb-2" />
            )
          )}
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

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-white px-5 py-2 rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          {id && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-red-600 hover:underline px-2"
            >
              Удалить упражнение
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
