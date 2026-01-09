'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Trip } from '@/types'
import { 
  Users, UserPlus, Copy, Check, Shield, LogOut, Crown 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Props {
  trip: Trip
}

// 定義更精確的型別，容許 profile 為 null
interface Member {
  role: string
  user_id: string
  profiles: {
    email: string
    username: string
    avatar_url?: string
  } | null // <--- 重點：有可能查不到 profile
}

export default function TripMembers({ trip }: Props) {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/trips/${trip.id}/join` 
    : ''

  useEffect(() => {
    const fetchData = async () => {
      // 1. 取得當前用戶 ID
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user?.id || null)

      // 2. 取得成員列表
      const { data, error } = await supabase
        .from('trip_members')
          .select(`
            role, user_id,
            profiles:profiles!trip_members_user_id_fkey ( email, username, avatar_url )
          `)
        .eq('trip_id', trip.id)
      
        // 在 TripMembers.tsx 的 useEffect 裡面
        if (error) {
          // 關鍵：使用 JSON.stringify 才能把 {} 裡面的秘密印出來
          console.error('🔥 真實錯誤訊息:', JSON.stringify(error, null, 2))
        }

      if (data) {
        // 這裡不需要 as any，因為我們上面定義了容許 null
        setMembers(data as unknown as Member[])
      }
    }
    fetchData()
  }, [trip.id, supabase])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          旅伴名單
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </h3>
        <Button onClick={() => setIsInviteOpen(true)} className="bg-black text-white hover:bg-gray-800 rounded-full shadow-lg">
          <UserPlus className="w-4 h-4 mr-2" />
          邀請朋友
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => {
          const isMe = member.user_id === currentUser
          const isOwner = member.role === 'owner' || member.user_id === trip.created_by
          
          // 🛡️ 防呆處理：如果 profiles 是 null，給予預設值
          const profile = member.profiles || { 
            username: '未知用戶', 
            email: 'No Email', 
            avatar_url: undefined 
          }

          return (
            <div key={member.user_id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">
                  {/* 使用可選串連 (?.) 防止崩潰 */}
                  {profile.username?.slice(0, 2).toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">
                    {profile.username || 'Unknown'}
                  </p>
                  {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">我</Badge>}
                </div>
                <p className="text-xs text-gray-400 truncate">{profile.email}</p>
              </div>

              <div>
                {isOwner ? (
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0 flex gap-1">
                    <Crown className="w-3 h-3" /> 團長
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-200 font-normal">
                    成員
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
        
        {/* 如果完全沒資料，顯示提示 */}
        {members.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 text-sm">
                尚無成員資料 (或讀取失敗)
            </div>
        )}
      </div>

      {/* 邀請視窗 (Dialog) */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> 邀請朋友加入
            </DialogTitle>
            <DialogDescription>
              將此連結傳送給您的朋友，他們點擊後即可加入此旅程。
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">Link</Label>
              <Input
                id="link"
                defaultValue={inviteLink}
                readOnly
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <Button size="sm" onClick={copyToClipboard} className="px-3 bg-black hover:bg-gray-800 text-white">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <p className="text-[10px] text-gray-400 mt-2">
              ⚠️ 任何擁有此連結的人都可以加入查看行程，請小心保管。
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}