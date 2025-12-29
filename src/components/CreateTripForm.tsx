'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Plane, Calendar as CalendarIcon, MapPin } from 'lucide-react'

// Shadcn UI components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CreateTripForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tripName: '',
    startDate: '',
    endDate: '',
    baseCurrency: 'TWD',
  })

  // 計算天數
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)) + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('請先登入')

        const totalDays = calculateDays(formData.startDate, formData.endDate)

        // 1. 建立旅程
        // (資料庫 Trigger 可能會在此時自動將此 user 加入 trip_members)
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .insert({
            trip_name: formData.tripName,
            start_date: formData.startDate,
            end_date: formData.endDate,
            total_days: totalDays,
            base_currency: formData.baseCurrency,
            created_by: user.id
          })
          .select()
          .single()

        if (tripError) throw tripError

        // 🛑 移除或註解掉這一段 🛑
        // 因為資料庫已經自動加過了，再加會報錯
        /* const { error: memberError } = await supabase
          .from('trip_members')
          .insert({
            trip_id: tripData.id,
            user_id: user.id,
            role: 'owner'
          })

        if (memberError) throw memberError
        */

        // 直接跳轉
        router.push(`/trips/${tripData.id}`)

      } catch (error: any) {
        console.error('Error:', error)
        alert('建立失敗: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

  const days = calculateDays(formData.startDate, formData.endDate)

  return (
    <div className="flex justify-center items-center w-full p-4">
      <Card className="w-full max-w-lg shadow-lg bg-gray-100">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit">
            <Plane className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">開啟新旅程</CardTitle>
          <CardDescription>
            輸入基本資訊，開始規劃你的完美假期
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 旅程名稱 */}
            <div className="space-y-2">
              <Label htmlFor="tripName">旅程名稱</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tripName"
                  placeholder="例如：北海道賞雪七日遊 ❄️"
                  className="pl-9 bg-white border border-white"
                  required
                  value={formData.tripName}
                  onChange={(e) => setFormData({...formData, tripName: e.target.value})}
                />
              </div>
            </div>

            {/* 日期選擇 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">出發日期</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    required
                    className="block bg-white border border-white" // 確保在各瀏覽器顯示正常
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">回程日期</Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    className='bg-white border border-white'
                    required
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* 天數與幣別資訊卡 */}
            <div className="rounded-lg p-4 flex items-center justify-between bg-white border border-white">
              <div className="flex items-center gap-2 ">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  共 <span className="text-primary text-lg font-bold mx-1">{days}</span> 天旅程
                </span>
              </div>

              <div className="w-[120px]">
                <Select 
                  value={formData.baseCurrency} 
                  onValueChange={(value) => setFormData({...formData, baseCurrency: value})}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="幣別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TWD">🇹🇼 TWD</SelectItem>
                    <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  開始規劃行程
                  <Plane className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}