import CreateTripForm from '@/components/CreateTripForm'

export default function NewTripPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* 背景圖片層 */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{
          // 使用 Unsplash 的隨機旅遊圖片
          backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')",
        }}
      >
        {/* 黑色漸層遮罩：修正了 bg-gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-[2px]"></div>
      </div>

      {/* 內容層：加入 z-index 確保在遮罩之上 */}
      <div className="relative z-10 w-full flex justify-center">
        <CreateTripForm />
      </div>
      
      {/* 底部版權或裝飾文字 */}
      <div className="absolute bottom-6 text-white/60 text-xs z-10 font-light tracking-widest pointer-events-none">
        DESIGN YOUR NEXT ADVENTURE
      </div>
    </div>
  )
}