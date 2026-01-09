'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trip, ItineraryItem } from '@/types'
import { createClient } from '@/utils/supabase/client'
import AddItineraryModal from './AddItineraryModal'
import { 
  Camera, Utensils, ShoppingBag, Car, BedDouble, Sparkles, Plus,
  Sun, CloudSun, Moon, MapPin, Clock, CircleDollarSign, ArrowRight
} from 'lucide-react'
import { Button } from "@/components/ui/button"

// 標籤與圖示設定
const ACTIVITY_ICONS: Record<string, any> = {
  sightseeing: Camera, meal: Utensils, shopping: ShoppingBag, transport: Car, accommodation: BedDouble, other: Sparkles,
}

// 根據類型決定卡片左側邊條顏色
const getTypeColor = (type: string) => {
  const map: Record<string, string> = {
    sightseeing: 'bg-orange-400', meal: 'bg-green-500', transport: 'bg-blue-500',
    shopping: 'bg-pink-400', accommodation: 'bg-indigo-500', other: 'bg-gray-400',
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
  const fetchItinerary = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('itinerary_details')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('trip_day', selectedDay) 
      .order('start_time', { ascending: true }) 

    if (error) console.error('Supabase error:', error)
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

  // 🔥 核心修改：優化後的行程渲染區塊 (Timeline Style)
  const renderSection = (title: string, icon: any, sectionItems: ItineraryItem[], period: 'morning' | 'afternoon' | 'evening', bgClass: string) => (
    <div className={`p-6 rounded-3xl ${bgClass} mb-8`}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-6 text-gray-800">
        {icon}
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <span className="text-xs bg-white/60 px-2 py-1 rounded-full text-gray-600 font-medium ml-auto">
          {sectionItems.length} 行程
        </span>
      </div>

      {/* Timeline Items */}
      <div className="space-y-0"> {/* space-y-0 因為我們要自己控制間距 */}
        {sectionItems.length === 0 ? (
          <button 
            onClick={() => handleAdd(period)}
            className="w-full py-10 border-2 border-dashed border-gray-300/60 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 hover:bg-white/40 transition-all group"
          >
            <div className="bg-white p-3 rounded-full mb-2 group-hover:scale-110 transition-transform shadow-sm">
                <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">安排{title}行程</span>
          </button>
        ) : (
          sectionItems.map((item, index) => {
            const isLast = index === sectionItems.length - 1
            
            return (
              <div key={item.id} className="flex gap-4 group relative">
                {/* --- 左側：時間軸 --- */}
                <div className="flex flex-col items-center min-w-[64px] pt-1">
                  {/* 開始時間 */}
                  <span className="text-sm font-bold text-gray-900 font-mono tracking-tighter">
                    {item.start_time?.slice(0, 5)}
                  </span>
                  
                  {/* 停留時間 (如果有) */}
                  {item.duration && (
                     <div className="text-[10px] text-gray-500 mt-1 bg-white/80 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-xs flex items-center gap-0.5">
                       <Clock className="w-2.5 h-2.5" />
                       {item.duration}m
                     </div>
                  )}

                  {/* 垂直連接線 (除了最後一個項目，都有線連到底部) */}
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-gray-300/30 my-2 rounded-full"></div>
                  )}
                </div>

                {/* --- 右側：內容卡片 --- */}
                <div 
                  onClick={() => handleEdit(item)} 
                  className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden group/card"
                >
                  {/* 左側彩色裝飾條 (依照活動類型) */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getTypeColor(item.activity_type)}`}></div>

                  {/* 上半部：標題與類型 */}
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover/card:text-blue-600 transition-colors">
                        {item.activity_name}
                    </h3>
                    {/* 類型 Icon */}
                    {/* <div className={`p-1.5 rounded-lg bg-gray-50 text-gray-400`}>
                       {item.activity_type === 'sightseeing' && <Camera className="w-4 h-4" />}
                       {item.activity_type === 'meal' && <Utensils className="w-4 h-4" />}
                       {item.activity_type === 'shopping' && <ShoppingBag className="w-4 h-4" />}
                       {item.activity_type === 'transport' && <Car className="w-4 h-4" />}
                    </div> */}
                  </div>

                  {/* 中間：地點 & 交通 (Tag 區) */}
                  <div className="flex flex-wrap gap-2 mb-3 pl-2">
                    {/* 地點 */}
                    {item.location && (
                      <div className="flex items-center text-xs text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-md border border-gray-100">
                        <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                        <span className="truncate max-w-[150px]">{item.location}</span>
                      </div>
                    )}
                    
                    {/* 交通方式 */}
                    {item.transportation && (
                      <div className="flex items-center text-xs text-gray-600 bg-blue-50/50 px-2.5 py-1 rounded-md border border-blue-100">
                        <Car className="w-3 h-3 mr-1 text-blue-500" />
                        <span>{item.transportation}</span>
                      </div>
                    )}
                  </div>

                  {/* 底部：備註 & 費用 */}
                  {(item.review_text || item.actual_cost || item.activity_cost) && (
                    <div className="pt-3 border-t border-dashed border-gray-100 flex justify-between items-end pl-2">
                      {/* 備註 (限制顯示兩行) */}
                      <p className="text-xs text-gray-400 line-clamp-2 max-w-[65%] italic leading-relaxed">
                        {item.review_text || ""}
                      </p>

                      {/* 費用顯示邏輯 */}
                      <div className="text-right">
                        {item.actual_cost ? (
                           // 如果有實際花費：顯示綠色粗體
                           <div className="flex items-center gap-1 text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                             <CircleDollarSign className="w-3.5 h-3.5" />
                             {item.actual_cost}
                           </div>
                        ) : item.activity_cost ? (
                           // 如果只有預估：顯示灰色
                           <div className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                             預估 ${item.activity_cost}
                           </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
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
      <div className="flex-none bg-white z-20 sticky top-0 border-b border-gray-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="pt-6 pb-2 px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">行程安排</h2>
            <p className="text-sm text-gray-400 font-medium mt-1">Day {selectedDay} / {trip.total_days}</p>
          </div>
          {/* 總新增按鈕 */}
          <Button onClick={() => handleAdd('morning')} className="bg-black hover:bg-gray-800 text-white rounded-full px-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
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
                className={`snap-center shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all duration-300 border ${isActive ? 'bg-black text-white shadow-lg scale-100 border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600 scale-95'}`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{weekDay}</span>
                <span className="text-xl font-bold font-sans mt-0.5">{day}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. 行程區塊列表 */}
      <div className="flex-1 overflow-y-auto p-6 bg-white pb-32">
        {loading ? (
           <div className="space-y-6 animate-pulse">
             <div className="h-48 bg-gray-100 rounded-3xl w-full"></div>
             <div className="h-48 bg-gray-100 rounded-3xl w-full"></div>
           </div>
        ) : (
          <>
            {renderSection('上午', <Sun className="w-6 h-6 text-orange-500" />, morningItems, 'morning', 'bg-gradient-to-br from-orange-50/80 to-white border border-orange-100')}
            {renderSection('下午', <CloudSun className="w-6 h-6 text-blue-500" />, afternoonItems, 'afternoon', 'bg-gradient-to-br from-blue-50/80 to-white border border-blue-100')}
            {renderSection('晚上', <Moon className="w-6 h-6 text-indigo-500" />, eveningItems, 'evening', 'bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100')}
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