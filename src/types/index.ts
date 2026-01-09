// 定義角色與活動類型的字串選項
export type Role = 'planner' | 'member' | 'viewer';
export type ActivityType = 'sightseeing' | 'meal' | 'transport' | 'shopping' | 'accommodation' | 'other';

// 使用者資料
export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

// 旅程主資料
export interface Trip {
  id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  base_currency: string;
  created_by: string;
}

// 旅伴資料
export interface TripMember {
  trip_id: string;
  user_id: string;
  role: Role;
  user?: UserProfile;
}

// --- 這裡就是修正的重點 ---
// 每日行程細節 (對應資料庫 itinerary_details 表)
export interface ItineraryItem {
  id: string;
  trip_id: string;
  trip_day: number;
  start_time: string;     // 格式通常為 "HH:mm:ss"
  end_time: string;
  activity_type: string;  // 使用 string 比較彈性，或使用 ActivityType
  activity_name: string;
  
  // 之前缺少的欄位補上：
  transportation?: string;     // 交通方式
  transport_time?: number;     // 交通時間 (分)
  transport_cost?: number;     // 交通費
  activity_cost?: number;      // 活動費
  location?: string;          // 地點
  duration?: number;          // 活動時間 (分)
  actual_cost?: number;       // 實際花費
  
  weather_condition?: string;  // 天氣
  outfit_suggestion?: string;  // 穿搭
  
  review_rating?: number;      // 評分
  review_text?: string;        // 評價
  order_index?: number;        // 排序
}

// 費用主單
export interface Cost {
  id: string;
  trip_id: string;
  payer_user_id: string;
  total_amount: number;
  currency: string;
  description: string;
  cost_date: string;
  // items: CostItem[]; // 之後做分帳時會用到
}
// 費用
export interface Expense {
  id: string
  trip_id: string
  payer_id: string
  description: string
  amount: number
  date: string
  created_at: string
  // 關聯資料 (Join 出來的)
  profiles?: {
    username: string
    avatar_url: string
  }
}

// 結算後的餘額物件
export interface Balance {
  user_id: string
  username: string
  avatar_url?: string
  paid: number   // 實際墊付金額
  share: number  // 應付金額 (平均分攤)
  balance: number // 結餘 (正數=應收, 負數=應付)
}