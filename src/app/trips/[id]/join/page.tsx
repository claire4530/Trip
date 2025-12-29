'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plane, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'

export default function JoinTripPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const tripId = params?.id as string
  const [tripName, setTripName] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkTripAndUser = async () => {
      // 1. 檢查用戶是否登入
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        // 沒登入就踢去登入頁 (登入完應該要跳回來，這裡先簡單處理)
        return
      }

      // 2. 抓取旅程資訊
      const { data: trip, error } = await supabase
        .from('trips')
        .select('trip_name')
        .eq('id', tripId)
        .single()

      if (error || !trip) {
        setErrorMsg('找不到此旅程，連結可能已失效。')
      } else {
        setTripName(trip.trip_name)
      }
      setLoading(false)
    }

    checkTripAndUser()
  }, [tripId, supabase])

  const handleJoin = async () => {
    if (!user) {
      router.push('/login') // 如果還沒登入
      return
    }

    setJoining(true)
    
    // 1. 嘗試加入
    const { error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        role: 'member'
      })

    // 2. 處理結果 (23505 是 Unique Key 衝突，代表已經加入過了，也算成功)
    if (!error || error.code === '23505') {
      router.push(`/trips/${tripId}`) // 跳轉回旅程首頁
    } else {
      setErrorMsg('加入失敗：' + error.message)
      setJoining(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-3xl"></div>
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/20">
             <Plane className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">加入旅程邀請</CardTitle>
          <CardDescription className="text-base mt-2">
            您被邀請加入以下旅程
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-6 pt-6">
          {errorMsg ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-900">{tripName}</h2>
              <p className="text-sm text-gray-400 mt-1">一起規劃這場冒險！</p>
            </div>
          )}

          {!user && (
            <p className="text-sm text-orange-500 font-medium">
              請先登入帳號以加入此旅程
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-8">
          {!user ? (
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full h-12 text-base bg-black hover:bg-gray-800"
            >
              登入 / 註冊
            </Button>
          ) : (
            <Button 
              onClick={handleJoin} 
              disabled={joining || !!errorMsg}
              className="w-full h-12 text-base bg-black hover:bg-gray-800 shadow-xl shadow-black/10"
            >
              {joining ? '加入中...' : (
                <span className="flex items-center gap-2">
                  確認加入 <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          )}
          <Button variant="ghost" onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600">
            不用了，謝謝
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}