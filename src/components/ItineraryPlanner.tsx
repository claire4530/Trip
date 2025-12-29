'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trip, ItineraryItem } from '@/types'
import { createClient } from '@/utils/supabase/client'
import AddItineraryModal from './AddItineraryModal'
import { 
  Camera, Utensils, ShoppingBag, Car, BedDouble, Sparkles, Plus,
  Sun, CloudSun, Moon
} from 'lucide-react'
import { Button } from "@/components/ui/button"

// 標籤與圖示設定
const ACTIVITY_LABELS: Record<string, string> = {
  sightseeing: '景點', meal: '美食', shopping: '購物', transport: '交通', accommodation: '住宿', other: '其他',
}
const ACTIVITY_ICONS: Record<string, any> = {
  sightseeing: Camera, meal: Utensils, shopping: ShoppingBag, transport: Car, accommodation: BedDouble, other: Sparkles,
}
const getTypeColor = (type: string) => {
  const map: Record<string, string> = {
    sightseeing: 'bg-orange-100 text-orange-700', meal: 'bg-green-100 text-green-700', transport: 'bg-blue-100 text-blue-700',
    shopping: 'bg-pink-100 text-pink-700', accommodation: 'bg-indigo-100 text-indigo-700', other: 'bg-gray-100 text-gray-600',
  }
  return map[type?.toLowerCase()] || map.other
}

interface Props {
  trip: Trip
}

export default function ItineraryPlanner({ trip }: Props) {
  const supabase = createClient()
  
  const [selectedDay, setSelectedDay] = useState(1)
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [defaultPeriod, setDefaultPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning')

  // 1. 抓取資料
// src/components/ItineraryPlanner.tsx

  const fetchItinerary = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('itinerary_details')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('trip_day', selectedDay) 
      // ❌ 原本可能有錯的寫法：
      // .order('created_at', { ascending: true }) 
      
      // ✅ 修改成這樣 (改回用 id 或 start_time 排序)：
      .order('start_time', { ascending: true }) 

    if (error) {
      console.error('Supabase error:', error) // 這樣寫可以看到更完整的錯誤訊息
      // alert(error.message) // 也可以選擇把它彈出來看
    }
    else setItems(data || [])
    
    setLoading(false)
  }, [trip.id, selectedDay, supabase])

  useEffect(() => {
    fetchItinerary()
  }, [fetchItinerary])

  // 2. 資料分組
  const morningItems = items.filter(i => parseInt(i.start_time?.split(':')[0] || '0') < 12)
  const afternoonItems = items.filter(i => {
    const h = parseInt(i.start_time?.split(':')[0] || '0')
    return h >= 12 && h < 18
  })
  const eveningItems = items.filter(i => parseInt(i.start_time?.split(':')[0] || '0') >= 18)

  // 3. 處理新增/編輯
  const handleAdd = (period: 'morning' | 'afternoon' | 'evening') => {
    setEditingItem(null)
    setDefaultPeriod(period)
    setIsModalOpen(true)
  }

  const handleEdit = (item: ItineraryItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const getDateInfo = (dayIndex: number) => {
    const date = new Date(trip.start_date)
    date.setDate(date.getDate() + (dayIndex - 1))
    const month = date.toLocaleDateString('en-US', { month: 'short' }) 
    const day = date.getDate() 
    const weekDay = date.toLocaleDateString('en-US', { weekday: 'short' }) 
    return { month, day, weekDay }
  }

  // 渲染單個區塊的 Helper Component
  const renderSection = (title: string, icon: any, sectionItems: ItineraryItem[], period: 'morning' | 'afternoon' | 'evening', bgColor: string) => (
    <div className={`p-6 rounded-3xl ${bgColor} mb-6`}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 text-gray-700">
        {icon}
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-xs bg-white/50 px-2 py-1 rounded-full text-gray-500 font-medium">
          {sectionItems.length} 個行程
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {sectionItems.length === 0 ? (
          <button 
            onClick={() => handleAdd(period)}
            className="w-full py-8 border-2 border-dashed border-gray-300/50 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-white/50 transition-all"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-sm">安排{title}行程</span>
          </button>
        ) : (
          sectionItems.map((item) => {
            const IconComponent = ACTIVITY_ICONS[item.activity_type] || Sparkles
            return (
              <div key={item.id} className="relative group ">
                {/* Card */}
                <div 
                  onClick={() => handleEdit(item)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-black/10 hover:shadow-md transition-all cursor-pointer flex gap-4 items-start"
                >
                  {/* Icon Box */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(item.activity_type)} bg-opacity-20`}>
                     <IconComponent className={`w-6 h-6 ${getTypeColor(item.activity_type).split(' ')[1]}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 truncate pr-2">{item.activity_name}</h4>
                      {item.review_rating && <span className="text-xs text-yellow-500 font-bold">★{item.review_rating}</span>}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {ACTIVITY_LABELS[item.activity_type]}
                      </span>
                      {item.transportation && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Car className="w-3 h-3" /> {item.transportation}
                        </span>
                      )}
                      {item.activity_cost && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                          ${item.activity_cost}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 行程間的小+號 (懸浮在下方) */}
                {/* <div className="h-4 w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 z-10">
                   <button 
                     onClick={() => handleAdd(period)}
                     className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                   >
                     <Plus className="w-3 h-3" />
                   </button>
                </div> */}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[600px]">
      
      {/* 1. Header & Date Strip */}
      <div className="flex-none bg-white z-20 sticky top-0 border-b border-gray-50">
        <div className="pt-6 pb-2 px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">行程安排</h2>
            <p className="text-sm text-gray-400 font-medium mt-1">Day {selectedDay} / {trip.total_days}</p>
          </div>
          {/* 總新增按鈕，預設加到上午 */}
          <Button onClick={() => handleAdd('morning')} className="bg-black hover:bg-gray-800 text-white rounded-full px-5 shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> 新增行程
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 pb-4 pt-2 snap-x">
          {Array.from({ length: trip.total_days }).map((_, i) => {
            const dayNum = i + 1
            const { day, weekDay } = getDateInfo(dayNum)
            const isActive = selectedDay === dayNum
            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`snap-center shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all duration-300 ${isActive ? 'bg-black text-white shadow-lg scale-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 scale-95'}`}
              >
                <span className="text-[10px] font-medium uppercase">{weekDay}</span>
                <span className="text-xl font-bold font-sans mt-0.5">{day}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. 行程區塊列表 */}
      <div className="flex-1 overflow-y-auto p-6 bg-white pb-32">
        {loading ? (
           <div className="space-y-4 animate-pulse">
             <div className="h-40 bg-gray-100 rounded-3xl w-full"></div>
             <div className="h-40 bg-gray-100 rounded-3xl w-full"></div>
             <div className="h-40 bg-gray-100 rounded-3xl w-full"></div>
           </div>
        ) : (
          <>
            {renderSection('上午', <Sun className="w-6 h-6 text-orange-500" />, morningItems, 'morning', 'bg-orange-50/50')}
            {renderSection('下午', <CloudSun className="w-6 h-6 text-blue-500" />, afternoonItems, 'afternoon', 'bg-blue-50/50')}
            {renderSection('晚上', <Moon className="w-6 h-6 text-indigo-500" />, eveningItems, 'evening', 'bg-indigo-50/50')}
          </>
        )}
      </div>

      <AddItineraryModal 
        isOpen={isModalOpen}
        onClose={setIsModalOpen}
        tripId={trip.id}
        day={selectedDay}
        onSuccess={fetchItinerary}
        initialData={editingItem}
        defaultPeriod={defaultPeriod}
      />
    </div>
  )
}