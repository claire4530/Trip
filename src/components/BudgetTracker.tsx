'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Trip, Expense, Balance } from '@/types'
import { Plus, Receipt, TrendingUp, DollarSign } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import AddExpenseModal from './AddExpenseModal'

interface Props {
  trip: Trip
}

export default function BudgetTracker({ trip }: Props) {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. 載入資料 (成員 + 支出)
  const fetchData = async () => {
    setLoading(true)
    
    // 抓成員
    const { data: membersData } = await supabase
      .from('trip_members')
      .select('user_id, profiles(username, avatar_url)')
      .eq('trip_id', trip.id)
    
    if (membersData) setMembers(membersData)

    // 抓支出
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('*, profiles(username, avatar_url)')
      .eq('trip_id', trip.id)
      .order('date', { ascending: false })
    
    if (expenseData) setExpenses(expenseData as any)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [trip.id])

  // 2. 核心演算法：計算餘額 (均分制)
  const { balances, totalCost } = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0)
    const memberCount = members.length || 1
    const averageCost = total / memberCount

    // 初始化每個人的帳本
    const balanceMap: Record<string, Balance> = {}
    members.forEach(m => {
      balanceMap[m.user_id] = {
        user_id: m.user_id,
        username: m.profiles.username,
        avatar_url: m.profiles.avatar_url,
        paid: 0,
        share: averageCost,
        balance: 0
      }
    })

    // 累加每個人「實際付出的錢」
    expenses.forEach(ex => {
      if (balanceMap[ex.payer_id]) {
        balanceMap[ex.payer_id].paid += ex.amount
      }
    })

    // 計算最終餘額 (已付 - 應付)
    // 正數 = 多付了 (別人要給我)
    // 負數 = 少付了 (我要給別人)
    const result = Object.values(balanceMap).map(b => ({
      ...b,
      balance: b.paid - b.share
    })).sort((a, b) => b.balance - a.balance) // 錢多的排前面

    return { balances: result, totalCost: total }
  }, [expenses, members])

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* 頂部總覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 總支出 */}
        <Card className="bg-black text-white border-0 shadow-xl md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 總支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalCost.toLocaleString()}</div>
            <div className="text-xs text-white/80 mt-2">
              平均每人 ${Math.round(totalCost / (members.length || 1)).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* 結算狀態 (誰該給誰錢) */}
        <Card className="bg-white border-gray-100 shadow-sm md:col-span-2">
          <CardHeader className="pb-2 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-gray-800">結算狀態</CardTitle>
            <span className="text-xs text-gray-400">均分制</span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {balances.map(b => (
                <div key={b.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={b.avatar_url} />
                      <AvatarFallback>{b.username.slice(0,2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">{b.username}</span>
                  </div>
                  
                  {/* 餘額顯示 */}
                  <div className={`text-sm font-mono font-bold ${b.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {b.balance >= 0 ? '+' : ''}{Math.round(b.balance).toLocaleString()}
                    <span className="text-[10px] font-normal text-gray-400 ml-1">
                      {b.balance >= 0 ? '應收' : '應付'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 支出明細列表 */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> 支出明細
          </h3>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-black hover:bg-gray-800 text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> 記一筆
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-50">
            {expenses.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p>還沒有任何記帳紀錄</p>
              </div>
            ) : (
              expenses.map(ex => (
                <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-full text-gray-500">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{ex.description}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {ex.profiles?.username} 先墊付 • {new Date(ex.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-gray-900">
                    ${ex.amount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add Modal */}
      <AddExpenseModal 
        isOpen={isModalOpen}
        onClose={setIsModalOpen}
        tripId={trip.id}
        members={members}
        onSuccess={fetchData}
      />
    </div>
  )
}