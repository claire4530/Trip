'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Mail, Lock, ArrowRight, Plane } from 'lucide-react'

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"

export default function AuthForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // --- 註冊模式 ---
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error
        alert('🎉 註冊成功！已自動登入。')
      } else {
        // --- 登入模式 ---
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error
      }

      router.push('/dashboard')
      router.refresh()

    } catch (error: any) {
      console.error('Auth Error:', error)
      alert(error.message || '發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
      <CardHeader className="space-y-1 text-center pb-8">
        <div className="mx-auto w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-black/20">
          <Plane className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {isSignUp ? '開始您的旅程' : '歡迎回來'}
        </CardTitle>
        <CardDescription className="text-base">
          {isSignUp ? '建立帳號以規劃您的下一場冒險' : '輸入您的帳號密碼以繼續'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密碼</Label>
              {!isSignUp && (
                <span className="text-xs text-gray-500 hover:text-black cursor-pointer transition-colors">
                  忘記密碼？
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 mt-2 text-base font-medium shadow-lg shadow-black/10 hover:shadow-black/20 transition-all bg-black hover:bg-gray-800" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                處理中...
              </>
            ) : (
              <span className="flex items-center gap-2">
                {isSignUp ? '註冊帳號' : '登入'}
                {!isSignUp && <ArrowRight className="w-4 h-4" />}
              </span>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4 pt-4 border-t border-gray-50 bg-gray-50/30">
        <div className="text-center text-sm text-gray-500">
          {isSignUp ? '已經有帳號了？' : '還沒有帳號？'}
          <Button 
            variant="link" 
            className="px-2 font-semibold text-black hover:text-gray-700 underline-offset-4"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? '點此登入' : '立即註冊'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}