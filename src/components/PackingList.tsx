'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Trip } from '@/types'
import { 
  Plus, Check, Trash2, User, Users, AlertTriangle, X, Meh, Smile 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Props {
  trip: Trip
}

interface PackingItem {
  id: string
  item_name: string
  category: 'personal' | 'public'
  claimed_by: string | null
  assign_to: string | null // 新增：指定給誰 (null 代表所有人都要帶)
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
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({}) 
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  
  // 輸入框狀態
  const [globalItemName, setGlobalItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<'personal' | 'public'>('personal')
  const [memberItemInputs, setMemberItemInputs] = useState<Record<string, string>>({}) // 每個成員獨立的輸入框
  const [loading, setLoading] = useState(false)

  // 1. 載入資料
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user?.id || null)

      // 抓成員 (注意：如果 DB 沒有 personality 欄位，select 會報錯，這裡做防呆)
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('user_id, role, personality, profiles(username, avatar_url)')
        .eq('trip_id', trip.id)
        .order('created_at')
      
      if (memberError) console.error('Member Fetch Error:', memberError)
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
    } catch (e) {
      console.error("Fetch Data Failed:", e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [trip.id])

  // 2. 新增全域物品 (公用 or 每人必帶)
  const handleAddGlobalItem = async () => {
    if (!globalItemName.trim()) return
    setLoading(true)
    
    const { error } = await supabase.from('packing_items').insert({
      trip_id: trip.id,
      item_name: globalItemName,
      category: newItemCategory,
      assign_to: null // 全域物品不指定人
    })

    if (!error) {
      setGlobalItemName('')
      fetchData()
    }
    setLoading(false)
  }

  // 3. 新增「指定成員」的私人物品
  const handleAddMemberItem = async (targetUserId: string) => {
    const itemName = memberItemInputs[targetUserId]
    if (!itemName?.trim()) return

    const { error } = await supabase.from('packing_items').insert({
      trip_id: trip.id,
      item_name: itemName,
      category: 'personal',
      assign_to: targetUserId // 關鍵：只指定給這個人
    })

    if (!error) {
      setMemberItemInputs(prev => ({...prev, [targetUserId]: ''}))
      fetchData()
    }
  }

  // 4. 刪除物品
  const handleDeleteItem = async (id: string) => {
    if(!confirm('確定要刪除此項目嗎？')) return
    await supabase.from('packing_items').delete().eq('id', id)
    fetchData()
  }

  // 5. 切換 P/J 屬性
  const togglePersonality = async (userId: string, current: string) => {
    // 樂觀更新 (Optimistic Update) 讓介面立刻反應
    const newType = current === 'P' ? 'J' : 'P'
    setMembers(prev => prev.map(m => m.user_id === userId ? {...m, personality: newType} : m))

    await supabase.from('trip_members')
      .update({ personality: newType })
      .eq('trip_id', trip.id)
      .eq('user_id', userId)
    
    // 背景默默更新資料，不需要 reload 整個畫面造成閃爍
  }

  // 6. 認領公用物品
  const toggleClaim = async (itemId: string, currentClaimer: string | null) => {
    if (currentClaimer && currentClaimer !== currentUser) return
    const newClaimer = currentClaimer ? null : currentUser
    
    // Optimistic
    setItems(prev => prev.map(i => i.id === itemId ? {...i, claimed_by: newClaimer} : i))

    await supabase.from('packing_items')
      .update({ claimed_by: newClaimer })
      .eq('id', itemId)
  }

  // 7. 打勾物品
  const toggleCheck = async (itemId: string, userId: string) => {
    const key = `${itemId}_${userId}`
    const isChecked = checkedState[key]

    // Optimistic
    setCheckedState(prev => ({ ...prev, [key]: !isChecked }))

    if (isChecked) {
      await supabase.from('packing_checks').delete().eq('item_id', itemId).eq('user_id', userId)
    } else {
      await supabase.from('packing_checks').insert({ trip_id: trip.id, item_id: itemId, user_id: userId })
    }
  }

  // 分類物品
  const publicItems = items.filter(i => i.category === 'public')
  // 找出「全域」的個人物品 (每個人都要帶的)
  const globalPersonalItems = items.filter(i => i.category === 'personal' && i.assign_to === null)

  return (
    <div className="h-full flex flex-col gap-8 pb-20">
      
      {/* --- 1. 新增全域控制台 --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> 新增裝備
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
               placeholder={newItemCategory === 'personal' ? "例如: 護照 (新增到所有人清單)" : "例如: 延長線 (新增到公用區)"}
               value={globalItemName}
               onChange={e => setGlobalItemName(e.target.value)}
               className="flex-1"
               onKeyDown={e => e.key === 'Enter' && handleAddGlobalItem()}
             />
          </div>
          <Button onClick={handleAddGlobalItem} disabled={loading} className="bg-black text-white hover:bg-gray-800 rounded-xl">
            新增
          </Button>
        </div>
      </div>

      {/* --- 2. 公用物品區 --- */}
      <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Users className="w-32 h-32" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          公用裝備認領區
        </h3>
        <p className="text-sm text-gray-500 mb-6">先搶先贏！避免重複帶東西。</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {publicItems.length === 0 && <p className="text-gray-400 text-sm col-span-full py-4 text-center">目前沒有公用物品</p>}
          
          {publicItems.map(item => {
            const claimer = members.find(m => m.user_id === item.claimed_by)
            const isClaimedByMe = item.claimed_by === currentUser

            return (
              <div key={item.id} className={`relative flex items-center justify-between p-3 rounded-xl border transition-all group ${item.claimed_by ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-dashed border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.claimed_by ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {claimer ? (
                      <Avatar className="w-8 h-8"><AvatarImage src={claimer.profiles.avatar_url} /><AvatarFallback>{claimer.profiles.username[0]}</AvatarFallback></Avatar>
                    ) : <Users className="w-4 h-4" />}
                  </div>
                  <span className={`font-medium ${item.claimed_by ? 'text-gray-900' : 'text-gray-500'}`}>{item.item_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" size="sm"
                    onClick={() => toggleClaim(item.id, item.claimed_by)}
                    disabled={!!item.claimed_by && !isClaimedByMe}
                    className={`h-8 px-3 rounded-lg text-xs font-bold ${isClaimedByMe ? 'bg-blue-600 text-white' : item.claimed_by ? 'text-gray-400' : 'bg-gray-100 hover:bg-black hover:text-white'}`}
                  >
                    {isClaimedByMe ? '我帶' : item.claimed_by ? '已認領' : '認領'}
                  </Button>
                  <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- 3. 成員行李清單 (P/J 模式) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {members.map(member => {
          const isPType = member.personality === 'P'
          const isMe = member.user_id === currentUser
          
          // 篩選出：(每人必帶) + (指定給這個人的私人物品)
          const memberSpecificItems = items.filter(i => i.category === 'personal' && i.assign_to === member.user_id)
          const displayItems = [...globalPersonalItems, ...memberSpecificItems]

          return (
            <div key={member.user_id} className={`rounded-3xl border-2 p-5 relative transition-all duration-500 ${isPType ? 'bg-red-50/30 border-red-200 shadow-sm' : 'bg-white border-gray-100 shadow-sm'}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
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
                    {/* 直接點擊切換 P/J */}
                    <button 
                      onClick={() => togglePersonality(member.user_id, member.personality || 'J')}
                      className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 mt-1 ${isPType ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                      {isPType ? <><Meh className="w-3 h-3"/> P 人 (隨性)</> : <><Smile className="w-3 h-3"/> J 人 (嚴謹)</>}
                    </button>
                  </div>
                </div>
                
                {isPType && <div className="animate-pulse"><AlertTriangle className="w-8 h-8 text-red-400 opacity-50" /></div>}
              </div>

              {/* P人警告 */}
              {isPType && (
                <div className="mb-4 bg-red-100/50 text-red-600 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                   <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                   <span>請隊友協助檢查：護照、手機、錢包！</span>
                </div>
              )}

              {/* 該成員的物品清單 */}
              <div className="space-y-2 mb-4">
                {displayItems.length === 0 && <p className="text-gray-300 text-sm text-center py-2">無項目</p>}
                
                {displayItems.map(item => {
                  const isChecked = checkedState[`${item.id}_${member.user_id}`]
                  // 如果是指定給個人的，顯示特殊標記
                  const isPrivate = item.assign_to === member.user_id

                  return (
                    <div key={item.id} className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleCheck(item.id, member.user_id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-green-500 border-green-500 text-white' : isPType ? 'border-red-300 bg-white' : 'border-gray-300 bg-white'}`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {item.item_name}
                          {isPrivate && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1 rounded">私人物品</span>}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-1 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )
                })}
              </div>

              {/* 新增該成員的私人物品 */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Input 
                   placeholder={`幫 ${member.profiles.username} 新增...`}
                   className="h-8 text-xs bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white transition-all"
                   value={memberItemInputs[member.user_id] || ''}
                   onChange={e => setMemberItemInputs(prev => ({...prev, [member.user_id]: e.target.value}))}
                   onKeyDown={e => e.key === 'Enter' && handleAddMemberItem(member.user_id)}
                />
                <Button 
                  size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                  onClick={() => handleAddMemberItem(member.user_id)}
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </Button>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}