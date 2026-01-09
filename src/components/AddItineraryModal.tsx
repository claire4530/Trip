'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ActivityType, ItineraryItem } from '@/types'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Camera, Utensils, ShoppingBag, Car, BedDouble, Sparkles, Trash2,
  Sun, CloudSun, Moon, MapPin, Clock, Coins, CircleDollarSign
} from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: (open: boolean) => void
  tripId: string
  day: number
  onSuccess: () => void
  initialData?: ItineraryItem | null
  defaultPeriod?: 'morning' | 'afternoon' | 'evening'
}

const ACTIVITY_TYPES = [
  { type: 'sightseeing', label: '景點', icon: Camera },
  { type: 'meal', label: '美食', icon: Utensils },
  { type: 'shopping', label: '購物', icon: ShoppingBag },
  { type: 'transport', label: '交通', icon: Car },
  { type: 'accommodation', label: '住宿', icon: BedDouble },
  { type: 'other', label: '其他', icon: Sparkles },
] as const

const PERIODS = [
  { id: 'morning', label: '上午', icon: Sun, startHour: 9 },
  { id: 'afternoon', label: '下午', icon: CloudSun, startHour: 14 },
  { id: 'evening', label: '晚上', icon: Moon, startHour: 19 },
] as const

export default function AddItineraryModal({ 
  isOpen, onClose, tripId, day, onSuccess, initialData, defaultPeriod 
}: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const isEditMode = !!initialData

  const [formData, setFormData] = useState({
    activityName: '',
    activityType: 'sightseeing' as ActivityType,
    timeOfDay: 'morning' as 'morning' | 'afternoon' | 'evening',
    location: '',        // 新增：地點
    duration: '',        // 新增：預估時間 (分鐘)
    cost: '',            // 預估花費
    actualCost: '',      // 新增：實際花費
    transportation: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // 判斷時段
        const hour = parseInt(initialData.start_time?.split(':')[0] || '9')
        let period: 'morning' | 'afternoon' | 'evening' = 'morning'
        if (hour >= 12 && hour < 18) period = 'afternoon'
        if (hour >= 18) period = 'evening'

        setFormData({
          activityName: initialData.activity_name,
          activityType: (initialData.activity_type as ActivityType) || 'sightseeing',
          timeOfDay: period,
          location: initialData.location || '',
          duration: initialData.duration?.toString() || '',
          cost: initialData.activity_cost?.toString() || '',
          actualCost: initialData.actual_cost?.toString() || '',
          transportation: initialData.transportation || '',
          notes: initialData.review_text || ''
        })
      } else {
        // 新增模式預設值
        setFormData({
          activityName: '',
          activityType: 'sightseeing',
          timeOfDay: defaultPeriod || 'morning',
          location: '',
          duration: '60', // 預設 60 分鐘
          cost: '',
          actualCost: '',
          transportation: '',
          notes: ''
        })
      }
    }
  }, [isOpen, initialData, defaultPeriod])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. 決定開始時間 (根據時段)
    const periodConfig = PERIODS.find(p => p.id === formData.timeOfDay)
    const startHour = periodConfig ? periodConfig.startHour : 9
    const startTimeStr = `${startHour.toString().padStart(2, '0')}:00:00`

    // 2. 計算結束時間 (根據 Duration)
    const durationMins = formData.duration ? parseInt(formData.duration) : 60
    const endDateObj = new Date(`2000-01-01T${startTimeStr}`)
    endDateObj.setMinutes(endDateObj.getMinutes() + durationMins)
    const endTimeStr = endDateObj.toTimeString().split(' ')[0]

    const payload = {
      trip_id: tripId,
      trip_day: day,
      activity_name: formData.activityName,
      activity_type: formData.activityType,
      start_time: startTimeStr,
      end_time: endTimeStr,
      
      // 新欄位
      location: formData.location || null,
      duration: durationMins,
      actual_cost: formData.actualCost ? parseFloat(formData.actualCost) : null,
      
      // 舊欄位
      transportation: formData.transportation || null,
      activity_cost: formData.cost ? parseFloat(formData.cost) : null,
      review_text: formData.notes || null
    }

    try {
      if (isEditMode && initialData) {
        const { error } = await supabase.from('itinerary_details').update(payload).eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('itinerary_details').insert(payload)
        if (error) throw error
      }
      onSuccess() 
      onClose(false)
    } catch (error: any) {
      alert('儲存失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData || !confirm('確定要刪除這個行程嗎？')) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('itinerary_details').delete().eq('id', initialData.id)
      if (error) throw error
      onSuccess()
      onClose(false)
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            {isEditMode ? '編輯行程' : '新增行程'}
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Day {day}</span>
          </DialogTitle>
          <DialogDescription className="hidden">行程詳細資訊</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <form id="trip-form" onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* 區塊 1: 類型與時段 (放在最上面，因為這是分類依據) */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({...formData, timeOfDay: p.id as any})}
                    className={`
                      flex items-center justify-center gap-2 p-3 rounded-xl border transition-all
                      ${formData.timeOfDay === p.id 
                        ? 'bg-black text-white border-black shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <p.icon className="w-4 h-4" />
                    <span className="text-sm font-bold">{p.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {ACTIVITY_TYPES.map((type) => (
                  <button
                    key={type.type}
                    type="button"
                    onClick={() => setFormData({...formData, activityType: type.type})}
                    className={`
                      flex flex-col items-center justify-center min-w-[4.5rem] h-[4.5rem] rounded-xl border transition-all flex-shrink-0
                      ${formData.activityType === type.type 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm scale-105 ring-1 ring-blue-200' 
                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                      }
                    `}
                  >
                    <type.icon className="w-6 h-6 mb-2" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 區塊 2: 核心資訊 (名稱、地點、時間) */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> 行程資訊
              </h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs text-gray-500 mb-1 block">活動名稱</Label>
                  <Input 
                    id="name"
                    placeholder="例如：清水寺" 
                    className="text-lg h-11 bg-white border-gray-200"
                    value={formData.activityName}
                    onChange={(e) => setFormData({...formData, activityName: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">地點</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="輸入地址或地標" 
                        className="pl-9 bg-white"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">預計停留 (分鐘)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input 
                        type="number"
                        placeholder="60" 
                        className="pl-9 bg-white"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 區塊 3: 預算與記帳 (並排顯示，方便對比) */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" /> 預算與花費
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* 預估花費 */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Label className="text-xs text-gray-500 mb-1.5 block">預估預算</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                    <Input 
                      type="number" 
                      placeholder="0"
                      className="pl-7 h-9 bg-white border-gray-200" 
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    />
                  </div>
                </div>

                {/* 實際花費 (強調顯示) */}
                <div className="bg-green-50/50 p-3 rounded-xl border border-green-100">
                  <Label className="text-xs text-green-700 mb-1.5 block flex items-center gap-1">
                    <CircleDollarSign className="w-3 h-3" /> 實際支出
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-green-600 text-sm">$</span>
                    <Input 
                      type="number" 
                      placeholder="還沒花錢"
                      className="pl-7 h-9 bg-white border-green-200 focus-visible:ring-green-500 text-green-700 font-medium" 
                      value={formData.actualCost}
                      onChange={(e) => setFormData({...formData, actualCost: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 區塊 4: 其他 */}
            <div className="space-y-3">
               <Label className="text-xs text-gray-500">備註 & 交通筆記</Label>
               <Input 
                 placeholder="交通方式 (選填)" 
                 className="bg-white mb-2"
                 value={formData.transportation}
                 onChange={(e) => setFormData({...formData, transportation: e.target.value})}
               />
               <Textarea 
                 placeholder="寫點筆記..." 
                 className="resize-none bg-white min-h-[80px]"
                 value={formData.notes}
                 onChange={(e) => setFormData({...formData, notes: e.target.value})}
               />
            </div>

          </form>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-gray-50/50 flex justify-between sm:justify-between items-center z-10">
          <div>
            {isEditMode && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9">
                {isDeleting ? '...' : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onClose(false)} type="button" className="h-10 px-6">取消</Button>
            <Button type="submit" form="trip-form" disabled={loading} className="bg-black hover:bg-gray-800 text-white h-10 px-8 rounded-full shadow-lg">
              {loading ? '儲存中...' : (isEditMode ? '完成' : '加入行程')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}