'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Trip } from '@/types'
import ItineraryPlanner from '@/components/ItineraryPlanner'
import { 
  CalendarRange, 
  Wallet, 
  Users, 
  MapPin, 
  Clock,
  LayoutDashboard,
  Backpack
} from 'lucide-react'
import TripMembers from '@/components/TripMembers'

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import BudgetTracker from '@/components/BudgetTracker'
import PackingList from '@/components/PackingList'

export default function TripDashboard() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  const tripId = params?.id as string

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) return
      const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
      if (error) router.push('/trips/new')
      else setTrip(data)
      setLoading(false)
    }
    fetchTrip()
  }, [tripId, supabase, router])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-[40vh] bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative space-y-6">
         <Skeleton className="h-12 w-64 rounded-xl mb-4" />
         <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    </div>
  )

  if (!trip) return null

  return (
    <div className="min-h-screen bg-gray-100/50 pb-20">
      
      {/* 1. Hero Header (背景圖區塊) */}
      <div className="relative h-[40vh] w-full overflow-hidden group">
        {/* 背景圖 - 增加縮放動畫 */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')` 
          }}
        >
          {/* 漸層遮罩 - 加深底部以凸顯文字 */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/10 backdrop-blur-[1px]"></div>
        </div>

        {/* 旅程資訊 (左下角) */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 pb-24 md:pb-28">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Badges */}
            <div className="flex gap-2 animate-fade-in-up">
               <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 px-3 py-1">
                  <Clock className="w-3 h-3 mr-1.5" />
                  {trip.total_days} Days
               </Badge>
               <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 px-3 py-1">
                  <MapPin className="w-3 h-3 mr-1.5" />
                  {trip.base_currency}
               </Badge>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg animate-fade-in-up delay-75">
              {trip.trip_name}
            </h1>
            
            {/* Date */}
            <p className="text-gray-200 font-medium flex items-center gap-2 text-sm opacity-90 animate-fade-in-up delay-100">
              <CalendarRange className="w-4 h-4" />
              {trip.start_date} ~ {trip.end_date}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Content Card (白色主卡片) */}
      <div className="max-w-5xl mx-auto px-4 relative -mt-16 z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100/50 overflow-hidden min-h-[600px]">
          
          <Tabs defaultValue="itinerary" className="w-full flex flex-col h-full">
            
            {/* Tab Header - 整合在卡片頂部，背景灰色，更有層次 */}
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
              <TabsList className="bg-gray-200/50 p-1 rounded-xl h-auto">
                <TabsTrigger 
                  value="itinerary" 
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
                >
                  <CalendarRange className="w-4 h-4 mr-2" />
                  行程表
                </TabsTrigger>
                <TabsTrigger 
                  value="budget" 
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  分帳
                </TabsTrigger>
                <TabsTrigger 
                  value="packing" // 建議改 value 比較語意化，或者保留 overview 但改顯示文字
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
                >
                  <Backpack className="w-4 h-4 mr-2" />
                  行李
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm transition-all"
                >
                  <Users className="w-4 h-4 mr-2" />
                  旅伴
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <TabsContent value="itinerary" className="m-0 h-full animate-fade-in">
                {/* 行程表元件 */}
                <div className="p-0">
                  <ItineraryPlanner trip={trip} />
                </div>
              </TabsContent>

              <TabsContent value="budget" className="m-0 h-full p-4 md:p-8 animate-fade-in bg-gray-50/30">
                {/* 分帳元件 */}
                <BudgetTracker trip={trip} />
              </TabsContent>

              <TabsContent value="members" className="m-0 p-8 animate-fade-in">
                {/* 旅行夥伴元件 */}
                <TripMembers trip={trip} />
              </TabsContent>
              <TabsContent value="packing" className="m-0 h-full animate-fade-in">
                <div className="p-4 md:p-8">
                  <PackingList trip={trip} />
                </div>
              </TabsContent>
            </div>

          </Tabs>
        </div>
      </div>
    </div>
  )
}