'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, DollarSign, Wallet } from 'lucide-react'

interface Member {
  user_id: string
  profiles: { username: string }
}

interface Props {
  isOpen: boolean
  onClose: (open: boolean) => void
  tripId: string
  members: Member[] // 傳入成員列表供選擇
  onSuccess: () => void
}

export default function AddExpenseModal({ isOpen, onClose, tripId, members, onSuccess }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // 預設 payer 為當前使用者
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    payerId: ''
  })

  // 初始化 payer (預設選第一個或自己)
  useEffect(() => {
    if (members.length > 0 && !formData.payerId) {
       // 這裡簡單處理，先選第一個，理想是用戶自己
       // 實際專案可從 context 抓 currentUserId
       setFormData(prev => ({ ...prev, payerId: members[0].user_id }))
    }
  }, [members, formData.payerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('expenses').insert({
        trip_id: tripId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payer_id: formData.payerId,
      })
      if (error) throw error
      onSuccess()
      onClose(false)
      setFormData(prev => ({ ...prev, description: '', amount: '' }))
    } catch (error: any) {
      alert('記帳失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> 新增支出
          </DialogTitle>
          <DialogDescription>記錄一筆消費，系統將自動平分。</DialogDescription>
        </DialogHeader>

        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label>消費項目</Label>
            <Input 
              placeholder="例如：第一天晚餐、超市採購" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>金額</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="number" 
                  className="pl-9" 
                  placeholder="0"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>誰先墊錢？</Label>
              <Select 
                value={formData.payerId} 
                onValueChange={val => setFormData({...formData, payerId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款人" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>取消</Button>
          <Button type="submit" form="expense-form" disabled={loading} className="bg-black text-white hover:bg-gray-800">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : '記一筆'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}