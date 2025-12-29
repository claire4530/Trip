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
  Sun, CloudSun, Moon 
} from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: (open: boolean) => void
  tripId: string
  day: number
  onSuccess: () => void
  initialData?: ItineraryItem | null
  defaultPeriod?: 'morning' | 'afternoon' | 'evening' // 改收時段而非時間
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
  { id: 'morning', label: '上午', icon: Sun, desc: '早餐 ~ 午餐前' },
  { id: 'afternoon', label: '下午', icon: CloudSun, desc: '午餐 ~ 晚餐前' },
  { id: 'evening', label: '晚上', icon: Moon, desc: '晚餐後 ~ 睡覺' },
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
    timeOfDay: 'morning' as 'morning' | 'afternoon' | 'evening', // 新增時段
    transportation: '',
    transportTime: '',
    cost: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // 判斷舊資料是哪個時段
        const hour = parseInt(initialData.start_time?.split(':')[0] || '9')
        let period: 'morning' | 'afternoon' | 'evening' = 'morning'
        if (hour >= 12 && hour < 18) period = 'afternoon'
        if (hour >= 18) period = 'evening'

        setFormData({
          activityName: initialData.activity_name,
          activityType: (initialData.activity_type as ActivityType) || 'sightseeing',
          timeOfDay: period,
          transportation: initialData.transportation || '',
          transportTime: initialData.transport_time?.toString() || '',
          cost: initialData.activity_cost?.toString() || '',
          notes: initialData.review_text || ''
        })
      } else {
        // 新增模式
        setFormData({
          activityName: '',
          activityType: 'sightseeing',
          timeOfDay: defaultPeriod || 'morning',
          transportation: '',
          transportTime: '',
          cost: '',
          notes: ''
        })
      }
    }
  }, [isOpen, initialData, defaultPeriod])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 自動分配隱藏時間，以便資料庫排序
    let startTime = '09:00:00'
    let endTime = '11:00:00'
    
    if (formData.timeOfDay === 'afternoon') {
      startTime = '14:00:00'
      endTime = '17:00:00'
    } else if (formData.timeOfDay === 'evening') {
      startTime = '19:00:00'
      endTime = '21:00:00'
    }

    const payload = {
      trip_id: tripId,
      trip_day: day,
      activity_name: formData.activityName,
      activity_type: formData.activityType,
      start_time: startTime, // 寫入隱藏時間
      end_time: endTime,     // 寫入隱藏時間
      transportation: formData.transportation || null,
      transport_time: formData.transportTime ? parseInt(formData.transportTime) : null,
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
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl">{isEditMode ? '編輯行程' : '新增行程'}</DialogTitle>
          <DialogDescription>Day {day}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <form id="trip-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* 1. 時段選擇 (重點修改) */}
            <div className="space-y-3">
              <Label>時段</Label>
              <div className="grid grid-cols-3 gap-3">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({...formData, timeOfDay: p.id as any})}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                      ${formData.timeOfDay === p.id 
                        ? 'bg-black text-white border-black shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <p.icon className="w-5 h-5 mb-1" />
                    <span className="text-sm font-bold">{p.label}</span>
                    <span className="text-[10px] opacity-70">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 類型 */}
            <div className="space-y-3">
              <Label>活動類型</Label>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {ACTIVITY_TYPES.map((type) => (
                  <button
                    key={type.type}
                    type="button"
                    onClick={() => setFormData({...formData, activityType: type.type})}
                    className={`
                      flex flex-col items-center justify-center min-w-[4.5rem] h-[4.5rem] rounded-xl border transition-all flex-shrink-0
                      ${formData.activityType === type.type 
                        ? 'bg-black text-white border-black shadow-md scale-105' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <type.icon className="w-6 h-6 mb-2" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">名稱</Label>
              <Input 
                id="name"
                placeholder="例如：清水寺" 
                className="text-lg h-12 bg-white"
                value={formData.activityName}
                onChange={(e) => setFormData({...formData, activityName: e.target.value})}
                required
              />
            </div>

            {/* 4. 詳細資訊 (移除時間輸入) */}
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-2 space-y-2">
                 <Label>交通方式 (選填)</Label>
                 <Input 
                   placeholder="如: 地鐵" 
                   className="bg-white"
                   value={formData.transportation}
                   onChange={(e) => setFormData({...formData, transportation: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <Label>預估花費</Label>
                 <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                    <Input 
                      type="number" 
                      className="pl-7 bg-white" 
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    />
                 </div>
               </div>
            </div>

            {/* 5. 備註 */}
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea 
                placeholder="寫點筆記..." 
                className="resize-none bg-white"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 border-t bg-gray-50/50 flex justify-between sm:justify-between items-center">
          <div>
            {isEditMode && (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                {isDeleting ? '刪除中...' : <><Trash2 className="w-4 h-4 mr-2" /> 刪除</>}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onClose(false)} type="button">取消</Button>
            <Button type="submit" form="trip-form" disabled={loading} className="bg-black hover:bg-gray-800 text-white">
              {loading ? '儲存中...' : (isEditMode ? '儲存變更' : '確認新增')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}