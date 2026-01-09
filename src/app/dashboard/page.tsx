'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Plus, Calendar, MapPin, ArrowRight, Clock, Plane } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface Trip {
  id: string
  trip_name: string
  start_date: string
  end_date: string
  total_days: number
  created_by: string
}

// 1. 準備一組精選的旅遊封面圖庫 (Unsplash ID)
const TRIP_IMAGES = [
  'photo-1476514525535-07fb3b4ae5f1', // 瑞士山景
  'photo-1469854523086-cc02fe5d8800', // 公路旅行
  'photo-1488646953014-85cb44e25828', // 旅遊意境
  'photo-1507525428034-b723cf961d3e', // 海灘
  'photo-1519681393784-d120267933ba', // 雪山星空
  'photo-1502602898657-3e91760cbb34', // 巴黎
  'photo-1523906834658-6e24ef2386f9', // 威尼斯
  'photo-1493246507139-91e8fad9978e', // 阿爾卑斯山
]

export default function DashboardPage() {
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (!user) return

        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            trip_members!inner(user_id)
          `)
          .eq('trip_members.user_id', user.id)
          .order('start_date', { ascending: true })

        if (error) throw error
        setTrips(data)
      } catch (error) {
        console.error('Error fetching trips:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrips()
  }, [])

  // 2. 修正圖片更換問題：根據 trip.id 產生固定的圖片索引
  // 這樣同一個旅程永遠會顯示同一張圖，不會重新整理就變掉
  const getStableImage = (tripId: string) => {
    // 簡單的雜湊算法：把 ID 的每個字元轉成數字相加
    let hash = 0
    for (let i = 0; i < tripId.length; i++) {
      hash += tripId.charCodeAt(i)
    }
    // 取餘數來決定用哪張圖
    const imageId = TRIP_IMAGES[hash % TRIP_IMAGES.length]
    return `https://images.unsplash.com/${imageId}?q=80&w=800&auto=format&fit=crop`
  }

  const getTripStatus = (startDate: string) => {
    const today = new Date()
    const start = new Date(startDate)
    // 只比較日期，忽略時間差異造成的誤差
    today.setHours(0, 0, 0, 0)
    start.setHours(0, 0, 0, 0)

    const diffTime = start.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: '已結束', color: 'bg-gray-100 text-gray-500', icon: Clock }
    if (diffDays === 0) return { label: '今天出發！', color: 'bg-blue-100 text-blue-600', icon: Plane }
    return { label: `倒數 ${diffDays} 天`, color: 'bg-green-100 text-green-600', icon: Clock }
  }

  if (loading) return (
    <div className="container mx-auto p-6 max-w-6xl">
       <div className="flex justify-between items-center mb-10">
          <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"></div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[320px] bg-gray-100 rounded-3xl animate-pulse"></div>
          ))}
       </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 max-w-6xl py-12">
        
        {/* Header 區塊 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              我的旅程
            </h1>
            <p className="text-gray-500 mt-2 text-base font-light">
              Hi <span className="font-medium text-gray-800">{user?.email?.split('@')[0]}</span>，準備好探索世界了嗎？🌍
            </p>
          </div>
          <Link href="/trips/new">
            <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              建立新旅程
            </Button>
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
              <Plane className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">還沒有任何旅程</h3>
            <p className="text-gray-500 mb-8 max-w-md text-center">
              生活不在別處，就在你即將前往的地方。現在就開始規劃你的第一個完美假期吧！
            </p>
            <Link href="/trips/new">
              <Button size="lg" className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg text-white">
                立即出發
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => {
              const status = getTripStatus(trip.start_date)
              const bgImage = getStableImage(trip.id)
              const StatusIcon = status.icon
              
              return (
                <Link href={`/trips/${trip.id}`} key={trip.id} className="block group h-full">
                  {/* 3. 修正卡片空白問題：
                      - 使用 overflow-hidden 確保內容不溢出
                      - 移除 Card 內部的 padding (p-0)，改在 CardContent 裡面加
                      - 確保圖片 div 是卡片的第一個子元素
                  */}
                  <Card className="pt-0 h-full border-0 shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                    
                    {/* 圖片區塊 */}
                    <div className="relative h-48 w-full overflow-hidden">
                      {/* 圖片載入前的背景色 */}
                      <div className="absolute inset-0" /> 
                      <img 
                        src={bgImage} 
                        alt={trip.trip_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* 黑色漸層，讓白色文字更清楚 */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-60" />
                      
                      {/* 右上角天數標籤 */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        {trip.total_days} 天
                      </div>
                    </div>

                    {/* 內容區塊 - 這裡才開始有 padding */}
                    <CardContent className="p-5 flex-1 flex flex-col">
                      
                      {/* 狀態標籤與目的地 */}
                      <div className="flex justify-between items-start mb-3">
                         <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </div>
                        {/* 這裡模擬目的地顯示，因為資料庫還沒存地點，暫時用 MapPin icon 裝飾 */}
                        <div className="text-gray-400">
                           <MapPin className="w-4 h-4" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                        {trip.trip_name}
                      </h3>
                      
                      <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>
                            {new Date(trip.start_date).toLocaleDateString()}
                            <span className="mx-2">-</span>
                            {new Date(trip.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    {/* 4. 移除原本意義不明的灰色圓點 (Avatar) 區塊 */}
                    {/* 改為簡單的箭頭提示 */}
                    <CardFooter className="p-5 pt-0 mt-2 flex justify-end">
                       <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          查看詳情 <ArrowRight className="w-3 h-3" />
                       </span>
                    </CardFooter>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}