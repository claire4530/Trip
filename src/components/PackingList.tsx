'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Trip } from '@/types'
import { 
  Plus, Check, Trash2, User, Users, AlertTriangle, X 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
  trip: Trip
}

interface PackingItem {
  id: string
  item_name: string
  category: 'personal' | 'public'
  claimed_by: string | null
}

interface Member {
  user_id: string
  role: string
  personality: 'P' | 'J'
  profiles: {
    username: string
    avatar_url: string
  }
}

export default function PackingList({ trip }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<PackingItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({}) // key: itemId_userId
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  
  // 新增狀態
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<'personal' | 'public'>('personal')
  const [loading, setLoading] = useState(false)

  // 1. 載入資料
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user?.id || null)

    // 抓成員
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('user_id, role, personality, profiles(username, avatar_url)')
      .eq('trip_id', trip.id)
      .order('created_at')
    if (memberData) setMembers(memberData as any)

    // 抓物品
    const { data: itemData } = await supabase
      .from('packing_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at')
    if (itemData) setItems(itemData as any)

    // 抓打勾狀態
    const { data: checkData } = await supabase
      .from('packing_checks')
      .select('*')
      .eq('trip_id', trip.id)
    
    if (checkData) {
      const state: Record<string, boolean> = {}
      checkData.forEach((c: any) => {
        state[`${c.item_id}_${c.user_id}`] = true
      })
      setCheckedState(state)
    }
  }

  useEffect(() => {
    fetchData()
  }, [trip.id])

  // 2. 新增物品
  const handleAddItem = async () => {
    if (!newItemName.trim()) return
    setLoading(true)
    
    const { error } = await supabase.from('packing_items').insert({
      trip_id: trip.id,
      item_name: newItemName,
      category: newItemCategory
    })

    if (!error) {
      setNewItemName('')
      fetchData()
    }
    setLoading(false)
  }

  // 3. 刪除物品
  const handleDeleteItem = async (id: string) => {
    if(!confirm('確定要刪除此項目嗎？')) return
    await supabase.from('packing_items').delete().eq('id', id)
    fetchData()
  }

  // 4. 切換 P/J 屬性
  const togglePersonality = async (userId: string, current: 'P' | 'J') => {
    const newType = current === 'P' ? 'J' : 'P'
    await supabase.from('trip_members')
      .update({ personality: newType })
      .eq('trip_id', trip.id)
      .eq('user_id', userId)
    fetchData()
  }

  // 5. 認領公用物品
  const toggleClaim = async (itemId: string, currentClaimer: string | null) => {
    // 如果已經被別人認領，且不是自己，則不能搶 (或是看需求)
    if (currentClaimer && currentClaimer !== currentUser) return

    const newClaimer = currentClaimer ? null : currentUser
    await supabase.from('packing_items')
      .update({ claimed_by: newClaimer })
      .eq('id', itemId)
    fetchData()
  }

  // 6. 打勾個人物品
  const toggleCheck = async (itemId: string, userId: string) => {
    const key = `${itemId}_${userId}`
    const isChecked = checkedState[key]

    if (isChecked) {
      // 取消打勾
      await supabase.from('packing_checks').delete()
        .eq('item_id', itemId).eq('user_id', userId)
    } else {
      // 打勾
      await supabase.from('packing_checks').insert({
        trip_id: trip.id, item_id: itemId, user_id: userId
      })
    }
    
    // Optimistic update
    setCheckedState(prev => ({ ...prev, [key]: !isChecked }))
  }

  // 分類物品
  const personalItems = items.filter(i => i.category === 'personal')
  const publicItems = items.filter(i => i.category === 'public')

  return (
    <div className="h-full flex flex-col gap-8 pb-20">
      
      {/* --- 1. 新增控制台 --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> 新增清單
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
             <div className="flex items-center space-x-2 bg-gray-50 px-3 rounded-xl border border-gray-200">
               <Switch 
                 id="cat-mode" 
                 checked={newItemCategory === 'public'}
                 onCheckedChange={(c) => setNewItemCategory(c ? 'public' : 'personal')}
               />
               <Label htmlFor="cat-mode" className="text-sm font-medium text-gray-600 whitespace-nowrap cursor-pointer min-w-[60px]">
                 {newItemCategory === 'personal' ? '每人必帶' : '大家公用'}
               </Label>
             </div>
             <Input 
               placeholder={newItemCategory === 'personal' ? "例如: 護照、內褲" : "例如: 吹風機、轉接頭"}
               value={newItemName}
               onChange={e => setNewItemName(e.target.value)}
               className="flex-1"
               onKeyDown={e => e.key === 'Enter' && handleAddItem()}
             />
          </div>
          <Button onClick={handleAddItem} disabled={loading} className="bg-black text-white hover:bg-gray-800 rounded-xl">
            新增項目
          </Button>
        </div>
      </div>

      {/* --- 2. 公用物品區 (大家一起用) --- */}
      <div className="bg-linear-to-br from-gray-50 to-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <Users className="w-32 h-32" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          公用裝備認領區
        </h3>
        <p className="text-sm text-gray-500 mb-6">先搶先贏！避免重複帶東西。</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {publicItems.length === 0 && <p className="text-gray-400 text-sm col-span-full py-4 text-center">還沒有公用物品，趕快新增！</p>}
          
          {publicItems.map(item => {
            const claimer = members.find(m => m.user_id === item.claimed_by)
            const isClaimedByMe = item.claimed_by === currentUser

            return (
              <div 
                key={item.id} 
                className={`
                  relative flex items-center justify-between p-3 rounded-xl border transition-all group
                  ${item.claimed_by 
                    ? 'bg-blue-50/50 border-blue-100' 
                    : 'bg-white border-dashed border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.claimed_by ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {claimer ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={claimer.profiles.avatar_url} />
                        <AvatarFallback>{claimer.profiles.username[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`font-medium ${item.claimed_by ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.item_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* 認領按鈕 */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleClaim(item.id, item.claimed_by)}
                    disabled={!!item.claimed_by && !isClaimedByMe} // 別人認領的不能點
                    className={`h-8 px-3 rounded-lg text-xs font-bold ${
                      isClaimedByMe 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' 
                        : item.claimed_by 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-100 hover:bg-black hover:text-white'
                    }`}
                  >
                    {isClaimedByMe ? '我帶！' : item.claimed_by ? '已認領' : '認領'}
                  </Button>

                  {/* 刪除按鈕 (Hover 顯示) */}
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- 3. 成員區塊 (每人必帶) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {members.map(member => {
          const isPType = member.personality === 'P'
          const isMe = member.user_id === currentUser

          return (
            <div 
              key={member.user_id}
              className={`
                rounded-3xl border-2 p-5 relative transition-all duration-500
                ${isPType 
                  ? 'bg-red-50/30 border-red-200 shadow-[0_0_20px_rgba(254,202,202,0.3)]' 
                  : 'bg-white border-gray-100 shadow-sm'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Avatar className={`w-12 h-12 border-2 ${isPType ? 'border-red-200' : 'border-gray-100'}`}>
                    <AvatarImage src={member.profiles.avatar_url} />
                    <AvatarFallback>{member.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg text-gray-900">{member.profiles.username}</h4>
                      {isMe && <Badge variant="secondary" className="text-[10px] h-5">我</Badge>}
                    </div>
                    {/* P/J 切換器 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                          isPType ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}>
                          {isPType ? '⚠️ P 人模式' : '📋 J 人模式'}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => togglePersonality(member.user_id, 'P')}>
                          <AlertTriangle className="w-4 h-4 mr-2 text-red-500" /> 設定為 P 人 (隨性)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePersonality(member.user_id, 'J')}>
                          <Check className="w-4 h-4 mr-2 text-blue-500" /> 設定為 J 人 (嚴謹)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isPType && (
                  <div className="animate-pulse">
                    <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
                  </div>
                )}
              </div>

              {/* P人警告語 */}
              {isPType && (
                <div className="mb-4 bg-red-100/50 text-red-600 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                   <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                   <span>警告：此人極度隨性，請隊友務必再次確認他的行李！尤其是護照！</span>
                </div>
              )}

              {/* 個人物品清單 */}
              <div className="space-y-2">
                {personalItems.length === 0 && <p className="text-gray-300 text-sm text-center py-2">無必帶項目</p>}
                
                {personalItems.map(item => {
                  const isChecked = checkedState[`${item.id}_${member.user_id}`]
                  
                  return (
                    <div 
                      key={item.id}
                      className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleCheck(item.id, member.user_id)}
                          className={`
                            w-5 h-5 rounded-md border flex items-center justify-center transition-all
                            ${isChecked 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : isPType ? 'border-red-300 bg-white' : 'border-gray-300 bg-white'
                            }
                          `}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {item.item_name}
                        </span>
                      </div>

                      {/* 刪除按鈕 (只有 Hover 時顯示，避免誤觸) */}
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-1 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}