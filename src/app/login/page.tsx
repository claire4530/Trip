import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* 背景圖片層 - 選擇一張星空或城市的圖片 */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{
          // Unsplash 關鍵字: night, city, travel
          backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        {/* 深色遮罩 */}
        <div className="absolute inset-0 bg-linear-to-br from-gray-900/60 to-black/80 backdrop-blur-[2px]"></div>
      </div>

      {/* 內容層 */}
      <AuthForm />
      
    </div>
  )
}